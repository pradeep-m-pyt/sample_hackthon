from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
import math
from scipy.optimize import minimize

from engines.carbon_engine import run_carbon_analysis
from engines.flood_engine import run_flood_analysis
from engines.solar_engine import run_solar_analysis
from engines.earth_engine import get_gee_data
from engines.open_meteo import get_rainfall_trend
from engines.context_engine import fetch_surroundings, generate_pre_analysis
from routers._osm_dist import build_distribution

router = APIRouter(prefix="/land", tags=["Smart Analysis"])

class SmartAnalysisRequest(BaseModel):
    lat: float
    lon: float
    area_m2: float
    landType: str
    plan: str
    investment: float
    timeline: int
    
class PreAnalyzeRequest(BaseModel):
    lat: float
    lon: float

# Approximation logic for TEEB coefficients (₹ per hectare over 10 years per TEEB India averages)
TEEB_COEFFICIENTS = {
    "Farmland": {"flood": 120_000, "water": 80_000},
    "Wetland": {"flood": 800_000, "water": 500_000},
    "Degraded / Barren Land": {"flood": 40_000, "water": 20_000},
    "Forest / Green Cover": {"flood": 400_000, "water": 300_000},
    "Empty Urban Plot": {"flood": 50_000, "water": 10_000},
    "Residential Plot": {"flood": 20_000, "water": 5_000},
    "Coastal Land": {"flood": 600_000, "water": 200_000},
}

# Generic ROI multipliers mapped to intent
ROI_RATES = {
    "Build Housing (Residential)": 1.8,
    "Build Commercial Complex": 2.2,
    "Set up Solar Farm": 1.4,
    "Continue Farming": 1.15,
    "Lease for Industry": 1.5,
    "Eco-Tourism / Conservation": 1.3,
    "Not Sure — Show Me Best Option": 1.5,
}

# Flood Risk multipliers
DAMAGE_RATES = {
    "High": 0.25,      # 25% of investment lost to flood damage/mitigation
    "Moderate": 0.10,
    "Low": 0.02
}

@router.post("/pre-analyse")
async def pre_analyse(req: PreAnalyzeRequest):
    """
    Fetches 8-10km surrounding context via Overpass API and feeds it to Groq.
    Suggests 2 eco-resources suited for the area.
    """
    context = await fetch_surroundings(req.lat, req.lon)
    recommendation = await generate_pre_analysis(req.lat, req.lon, context)
    return {
        "context_data": context,
        "recommendation": recommendation
    }

@router.post("/smart-analyse")
async def smart_analyse(req: SmartAnalysisRequest):
    area_ha = req.area_m2 / 10000.0

    # 1. Dynamically build accurate distribution map from Overpass OSM + User Fallbacks
    dist = await build_distribution(req.lat, req.lon, req.landType)

    # Parallel dispatch to underlying physics engines
    task_carbon = run_carbon_analysis(req.area_m2, dist, years=req.timeline)
    task_flood  = run_flood_analysis(req.lat, req.lon, dist, 5.0, 2.0)
    task_solar  = run_solar_analysis(req.lat, req.lon, req.area_m2, dist)
    task_gee    = get_gee_data(req.lat, req.lon, radius_in_meters=math.sqrt(req.area_m2))
    task_meteo  = get_rainfall_trend(req.lat, req.lon)

    carbon_data, flood_data, solar_data, gee_data, meteo_data = await asyncio.gather(
        task_carbon, task_flood, task_solar, task_gee, task_meteo
    )

    # 1. Base Variables
    # The actual Carbon engine handles live fetching of SCC/VCS.
    # We will use the market rate for the scenario calculator (conservative passive income).
    carbon_revenue_10yr = carbon_data["annual_credit_revenue_inr"] * req.timeline
    
    # 2. Extract TEEB multipliers for ecosystem services 
    # (Scale by timeline if timeframe differs from standard 10 years, though TEEB assumes a baseline)
    time_factor = req.timeline / 10.0
    teeb = TEEB_COEFFICIENTS.get(req.landType, TEEB_COEFFICIENTS["Empty Urban Plot"])
    flood_value = area_ha * teeb["flood"] * time_factor
    water_value = area_ha * teeb["water"] * time_factor

    # 3. Solar Calculations
    irradiance = solar_data.get("avg_daily_ghi_kwh_m2", 5.2)
    solar_npv  = solar_data.get("npv_25yr_inr", 0)
    solar_annual = solar_data.get("annual_revenue_inr", 0)
    
    # 4. Development Strategy
    dev_gross_revenue = req.investment * ROI_RATES.get(req.plan, 1.5)
    dev_profit = dev_gross_revenue - req.investment
    
    flood_level = flood_data["risk_label"]
    flood_risk_cost = dev_gross_revenue * DAMAGE_RATES.get(flood_level, 0.10)
    dev_net = dev_profit - flood_risk_cost

    # 5. Smart Optimization Engine (SciPy)
    # Total Value = Ecosystem_Value(green_pct) + Dev_Value(1 - green_pct)
    def calculate_ecosystem(green_pct: float) -> float:
        cb = carbon_revenue_10yr * green_pct
        fl = flood_value * green_pct
        wt = water_value * green_pct
        return cb + fl + wt

    def calculate_development(dev_pct: float) -> float:
        # Development scales with percentage of land used
        dp = dev_profit * dev_pct
        # Flood risk damage is inversely proportional to green cover (i.e. more green = less flood damage modifier)
        fr = flood_risk_cost * dev_pct * (1.0 + (1 - dev_pct)) 
        return dp - fr
    
    def objective_function(x):
        green_pct = x[0]
        # We want to MAXIMIZE total value, so we MINIMIZE negative total value
        solar_val = solar_npv if green_pct > 0.15 else 0 # Minimum solar threshold
        return -(calculate_ecosystem(green_pct) + calculate_development(1.0 - green_pct) + solar_val)

    # Scipy Minimize (bounds 10% to 90% green coverage to ensure realism)
    res = minimize(objective_function, x0=[0.5], bounds=[(0.1, 0.9)])
    optimal_green_split = float(res.x[0])

    # Ensure precision issues don't output 0.4000000000000004
    optimal_green_split = round(optimal_green_split, 2)

    # SCENARIO GENERATION (All scaled to req.timeline)

    # A. "Your Plan" (Heavy Development: e.g. 10% Green, 90% Dev)
    yp_green = 0.10
    yp_dev   = 0.90
    yp_eco   = calculate_ecosystem(yp_green)
    yp_dvp   = calculate_development(yp_dev)
    yp_total = yp_eco + yp_dvp + (solar_npv if req.plan == "Set up Solar Farm" else 0)

    # B. "Full Conserve" (90% Green, 10% minimal dev/pathways)
    fc_green = 0.90
    fc_dev   = 0.10
    fc_eco   = calculate_ecosystem(fc_green)
    fc_dvp   = calculate_development(fc_dev)
    fc_total = fc_eco + fc_dvp + (solar_npv * 0.2) # small off-grid solar

    # C. "Smart Hybrid" (Optimized Split)
    sh_green = optimal_green_split
    sh_dev   = 1.0 - sh_green
    sh_eco   = calculate_ecosystem(sh_green)
    sh_dvp   = calculate_development(sh_dev)
    sh_total = sh_eco + sh_dvp + solar_npv

    # Construct the JSON Payload
    response = {
        "raw_data": {
            "ndvi": gee_data["ndvi"],
            "canopy_cover": gee_data["canopy_cover"],
            "flood_risk": flood_data["risk_label"],
            "solar_potential": round(irradiance, 1),
            "carbon_stock_tonnes": round(carbon_data["stored_co2_tons"], 1),
            "water_stress": meteo_data, 
            "land_surface_temp": gee_data["lst"],
            "green_loss_pct": gee_data["land_cover_change"]
        },
        "scenarios": {
            "your_plan": {
                "title": req.plan,
                "total_value": round(yp_total, 0),
                "breakdown": {
                    "dev_profit": round(dev_profit * yp_dev, 0),
                    "flood_risk_cost": round(-(flood_risk_cost * yp_dev * 1.9), 0),
                    "carbon": 0,
                    "flood_sav": round(flood_value * yp_green, 0),
                    "water_filt": 0,
                    "solar": round(solar_annual if req.plan == "Set up Solar Farm" else 0, 0)
                },
                "risk": "High" if yp_dev > 0.7 else "Moderate"
            },
            "full_conserve": {
                "title": "Keep it Natural",
                "total_value": round(fc_total, 0),
                "breakdown": {
                    "dev_profit": 0,
                    "flood_risk_cost": 0,
                    "carbon": round(carbon_revenue_10yr * fc_green, 0),
                    "flood_sav": round(flood_value * fc_green, 0),
                    "water_filt": round(water_value * fc_green, 0),
                    "solar": round(solar_annual * 0.2, 0)
                },
                "risk": "Low"
            },
            "smart_hybrid": {
                "title": "Best of Both",
                "total_value": round(sh_total, 0),
                "optimal_split_green_pct": optimal_green_split,
                "breakdown": {
                    "dev_profit": round(dev_profit * sh_dev, 0),
                    "flood_risk_cost": round(-(flood_risk_cost * sh_dev * (1.0 + sh_green)), 0),
                    "carbon": round(carbon_revenue_10yr * sh_green, 0),
                    "flood_sav": round(flood_value * sh_green, 0),
                    "water_filt": round(water_value * sh_green, 0),
                    "solar": round(solar_annual, 0)
                },
                "risk": "Low" if sh_green > 0.3 else "Moderate"
            }
        },
        # For the dynamic slider
        "base_metrics": {
            "carbon_10yr_100pct": carbon_revenue_10yr,
            "flood_10yr_100pct": flood_value,
            "water_10yr_100pct": water_value,
            "dev_profit_100pct": dev_profit,
            "flood_risk_cost_100pct": flood_risk_cost,
            "solar_revenue_base": solar_revenue
        }
    }

    return response
