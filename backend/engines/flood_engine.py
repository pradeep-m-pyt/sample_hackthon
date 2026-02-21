import httpx
import math
import asyncio
from typing import Dict, Tuple
from datetime import datetime, timedelta

# ── SCS Curve Number Table (NRCS TR-55, AMC-II condition) ──────────────────
CN_TABLE: Dict[str, float] = {
    "forest":      55.0,
    "wetland":     78.0,
    "agriculture": 75.0,
    "urban":       92.0,
    "open_land":   68.0,
    "water":       98.0,
}

# ── Upgraded Benchmarks & Constants ─────────────────────────────────────────
# NMCG 2024: ₹90–120/m³ (treatment) + damage/health costs → ₹150/m³ blended
STORMWATER_COST_INR_M3 = 150.0

# Return Period Factors (simplified multiplier for Design Storm P_24h)
# Used when full IDF curves aren't available; based on Gumbel distribution averages
RETURN_PERIOD_FACTORS = {
    "10yr":  1.25,
    "25yr":  1.60,
    "100yr": 2.20,
}

# NASA POWER API endpoints
NASA_POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"


async def fetch_flood_weather_data(lat: float, lng: float) -> Tuple[float, float]:
    """
    Fetches:
    1. Annual Rainfall (P_annual)
    2. 5-day Max Antecedent Rainfall (AMC check)
    """
    now = datetime.now()
    year = now.year - 1 # Use previous complete year
    
    # Fetch Annual P
    monthly_params = {
        "parameters": "PRECTOTCORR",
        "community": "AG",
        "longitude": str(lng),
        "latitude": str(lat),
        "format": "JSON",
        "start": str(year),
        "end": str(year),
    }

    # Fetch 5-day Daily for AMC (representative high-intensity week)
    daily_params = {
        "parameters": "PRECTOTCORR",
        "community": "AG",
        "longitude": str(lng),
        "latitude": str(lat),
        "format": "JSON",
        "start": f"{year}0801", # Peak monsoon focus for India AMC check
        "end": f"{year}0807",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Parallel fetches for efficiency
            m_res, d_res = await asyncio.gather(
                client.get(NASA_POWER_MONTHLY_URL, params=monthly_params),
                client.get(NASA_POWER_DAILY_URL, params=daily_params)
            )
            
            m_data = m_res.json()
            d_data = d_res.json()

            annual_p = sum(m_data["properties"]["parameter"]["PRECTOTCORR"].values())
            
            # Use max 5-day sum from the sample week as a representative AMC
            daily_vals = list(d_data["properties"]["parameter"]["PRECTOTCORR"].values())
            amc_5day = sum(daily_vals[:5]) if len(daily_vals) >= 5 else (annual_p / 73.0)
            
            return round(annual_p, 2), round(amc_5day, 2)
    except Exception as e:
        print(f"Weather fetch error: {e}")
        return 1200.0, 45.0 # Fallbacks


def get_amc_condition(amc_5day: float) -> int:
    """
    Returns AMC condition I, II, or III based on rainfall depth.
    Thresholds: <36mm (I), 36-53mm (II), >53mm (III)
    """
    if amc_5day < 36: return 1
    if amc_5day > 53: return 3
    return 2


def adjust_cn(base_cn: float, amc: int, slope_pct: float) -> float:
    """
    Adjusts Curve Number for Antecedent Moisture (AMC) and Slope.
    """
    # 1. AMC Adjustment (SCS TR-55 equations)
    if amc == 1:
        cn = base_cn / (2.281 - 0.01281 * base_cn)
    elif amc == 3:
        cn = base_cn / (0.427 + 0.00573 * base_cn)
    else:
        cn = base_cn

    # 2. Slope Correction (Audit recommendation)
    # CN_adj = CN + (slope * 0.3) for slopes >5%, cap at +5
    if slope_pct > 5:
        slope_adj = min(5.0, (slope_pct - 5) * 0.3)
        cn += slope_adj
        
    return min(99.0, max(10.0, cn))


def calculate_runoff_mm(P_mm: float, CN: float) -> float:
    """Standard SCS Runoff Depth formula."""
    if CN <= 0 or CN >= 100 or P_mm <= 0: return 0.0
    S = (25400 / CN) - 254
    Ia = 0.2 * S
    if P_mm <= Ia: return 0.0
    return ((P_mm - Ia) ** 2) / (P_mm + 0.8 * S)


async def run_flood_analysis(lat, lng, distribution, elevation, slope) -> Dict:
    # 1. Get Data
    annual_p, amc_5day = await fetch_flood_weather_data(lat, lng)
    amc_cat = get_amc_condition(amc_5day)
    
    # 2. Design Storm Disaggregation (Audit: ~15% of annual P for 24-hr event)
    p_design = annual_p * 0.15 
    
    # 3. CN Calculation with Adjustments
    base_cn = sum(distribution.get(cat, 0.0) * CN_TABLE.get(cat, 70.0) for cat in CN_TABLE)
    cn_current = adjust_cn(base_cn, amc_cat, slope)
    cn_developed = adjust_cn(92.0, amc_cat, slope) # Typical urban developed CN

    # 4. Return Period Analysis
    rp_depths = { k: p_design * v for k, v in RETURN_PERIOD_FACTORS.items() }
    rp_runoff = { k: calculate_runoff_mm(v, cn_current) for k, v in rp_depths.items() }

    # 5. Monetization & Metrics
    # Runoff Delta at 25-yr storm (Design standard)
    q_curr = calculate_runoff_mm(rp_depths["25yr"], cn_current)
    q_dev  = calculate_runoff_mm(rp_depths["25yr"], cn_developed)
    delta_q = max(0.0, q_dev - q_curr)
    
    # Damage Avoided (₹/m²)
    # (delta_mm/1000) * cost_m3
    damage_avoided = (delta_q / 1000.0) * STORMWATER_COST_INR_M3

    # 6. Risk Score (Log-scale elevation + rain + slope)
    # min(1, e^(-0.05 * elev))
    elev_risk = min(1.0, math.exp(-0.05 * elevation))
    rain_risk = min(1.0, annual_p / 3000.0)
    slope_risk = min(1.0, slope / 30.0)
    
    composite_risk = round(0.4 * elev_risk + 0.4 * rain_risk + 0.2 * slope_risk, 4)
    
    return {
        "annual_rainfall_mm":    round(annual_p, 1),
        "design_storm_p_mm":     round(p_design, 1),
        "amc_condition":         amc_cat,
        "cn_current":            round(cn_current, 2),
        "cn_developed":          round(cn_developed, 2),
        "flood_depth_10yr_mm":   round(rp_runoff["10yr"], 2),
        "flood_depth_25yr_mm":   round(rp_runoff["25yr"], 2),
        "flood_depth_100yr_mm":  round(rp_runoff["100yr"], 2),
        "delta_runoff_mm":       round(delta_q, 2),
        "annual_damage_avoided_inr_per_m2": round(damage_avoided, 4),
        "flood_risk_score":      min(1.0, composite_risk),
        "risk_label":            "High" if composite_risk > 0.7 else "Moderate" if composite_risk > 0.35 else "Low",
        "detention_storage_m3_per_ha": round(delta_q * 10.0, 2), # 1mm on 1ha = 10m3
    }

if __name__ == "__main__":
    # Internal test for Mumbai Suburban Sample
    sample_dist = {"urban": 0.6, "open_land": 0.4}
    async def test():
        res = await run_flood_analysis(19.07, 72.87, sample_dist, 10, 2.0)
        import json; print(json.dumps(res, indent=2))
    asyncio.run(test())
