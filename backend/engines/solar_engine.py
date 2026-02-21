import httpx
from typing import Dict, List
import math

async def get_solar_irradiance(lat: float, lng: float) -> float:
    """Fetches daily average solar irradiance (kWh/m2/day) from NASA POWER"""
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude={lng}&latitude={lat}&format=JSON&start=20230101&end=20231231"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            data = res.json()
            irradiance_vals = data['properties']['parameter']['ALLSKY_SFC_SW_DWN']
            avg_daily = sum(irradiance_vals.values()) / len(irradiance_vals)
            return avg_daily
    except Exception as e:
        print(f"NASA Solar API error: {e}")
        return 5.0 # Default fallback for sunny region (kWh/m2/day)

async def run_solar_analysis(
    lat: float, 
    lng: float, 
    area_m2: float,
    distribution: Dict[str, float]
) -> Dict:
    irradiance = await get_solar_irradiance(lat, lng)
    
    # 1. Usable area for solar (mostly open_land and rooftops/urban)
    open_factor = distribution.get("open_land", 0)
    urban_factor = distribution.get("urban", 0) * 0.3 # Assume 30% rooftop availability
    
    usable_area = area_m2 * (open_factor + urban_factor)
    
    # 2. Panel calculation (1 panel = 400W, 2m2)
    panel_area = 2.0
    panel_capacity_kw = 0.4
    panel_count = math.floor(usable_area / panel_area)
    
    # 3. Generation calculation
    # kwh = panel_count * kw_per_panel * h_irradiance * 365 * efficiency
    efficiency = 0.75 # System losses
    annual_kwh = panel_count * panel_capacity_kw * irradiance * 365 * efficiency
    
    # 4. Economics (INR)
    grid_tariff = 4.5 # ₹/kWh
    annual_revenue = annual_kwh * grid_tariff
    
    cost_per_kw = 60000 # ₹/kW
    total_investment = (panel_count * panel_capacity_kw) * cost_per_kw
    
    payback_years = total_investment / annual_revenue if annual_revenue > 0 else 99
    
    return {
        "avg_daily_irradiance": irradiance,
        "panel_count": panel_count,
        "installed_capacity_kw": panel_count * panel_capacity_kw,
        "annual_generation_kwh": annual_kwh,
        "annual_revenue_inr": annual_revenue,
        "total_investment_inr": total_investment,
        "payback_years": round(payback_years, 1)
    }
