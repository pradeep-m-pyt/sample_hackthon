import httpx
import math
from datetime import datetime, timedelta
from typing import Dict, List

# NASA POWER endpoints
NASA_POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# ── Panel Specifications ─────────────────────────────────────────────────────
PANEL_AREA_M2        = 1.6      # User specified area
PANEL_EFFICIENCY     = 0.18     # 18 % efficiency (user specified)
SYSTEM_LOSS_FACTOR   = 0.15     # 15 % losses (dirt, wiring, inverter)
PANEL_DEGRADATION    = 0.005    # 0.5 % annual output degradation
PANEL_LIFETIME_YEARS = 25       
TEMP_COEFF           = -0.004   # -0.4%/°C (Standard for Si panels)
NOCT_OFFSET          = 25       # degrees offset for NOCT calculation

# ── Industry-standard Indian Solar Economics ─────────────────────────────────
CAPEX_PER_W_INR      = 55.0      # ₹55 per Watt peak
GST_RATE             = 0.05      # 5 % GST on solar components
OPEX_RATE            = 0.01      # 1 % of Capex per year (Year 1)
OPEX_ESCALATION      = 0.025     # 2.5 % annual O&M inflation
GRID_TARIFF_INR_KWH  = 4.75      # ₹/kWh (average industrial + commercial FiT)
DISCOUNT_RATE        = 0.09      

SOLAR_ELIGIBLE_FRACTION: Dict[str, float] = {
    "open_land":   1.00,
    "agriculture": 0.40,
    "urban":       0.25,
    "forest":      0.00,
    "wetland":     0.00,
    "water":       0.05,
}

async def fetch_historical_solar_weather(lat: float, lng: float, year: int, month: int) -> Dict[str, Dict[str, float]]:
    """
    Fetches daily GHI (kWh/m2/day) and Temperature (T2M) for a specific year and month.
    """
    start_date = f"{year}{month:02d}01"
    last_day = (datetime(year, month, 1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    end_date = last_day.strftime("%Y%m%d")

    params = {
        "start": start_date,
        "end": end_date,
        "latitude": lat,
        "longitude": lng,
        "parameters": "ALLSKY_SFC_SW_DWN,T2M",
        "community": "RE",
        "format": "JSON"
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(NASA_POWER_DAILY_URL, params=params)
            data = res.json()
            return data["properties"]["parameter"]
    except Exception as e:
        print(f"NASA POWER Weather fetch error ({year}-{month}): {e}")
        return {}

def calculate_irr(cash_flows: List[float], guess: float = 0.1) -> float:
    """Simple Newton-Raphson IRR implementation."""
    for _ in range(100):
        npv = sum(cf / (1 + guess)**t for t, cf in enumerate(cash_flows))
        d_npv = sum(-t * cf / (1 + guess)**(t+1) for t, cf in enumerate(cash_flows))
        if abs(d_npv) < 1e-6: break
        new_guess = guess - npv / d_npv
        if abs(new_guess - guess) < 1e-7: return new_guess
        guess = new_guess
    return guess

async def get_solar_weather_expectation(lat: float, lng: float) -> Dict[str, float]:
    """
    Calculates avg daily GHI and T2M based on 4-year history.
    """
    current_date = datetime.now()
    next_month_date = (current_date.replace(day=28) + timedelta(days=4)).replace(day=1)
    target_month = next_month_date.month
    years = [next_month_date.year - i for i in range(1, 5)]
    
    all_ghi = []
    all_temp = []
    
    for year in years:
        weather_data = await fetch_historical_solar_weather(lat, lng, year, target_month)
        if weather_data:
            ghi_dict = weather_data.get("ALLSKY_SFC_SW_DWN", {})
            temp_dict = weather_data.get("T2M", {})
            all_ghi.append([v for v in ghi_dict.values() if v >= 0])
            all_temp.append([v for v in temp_dict.values() if v > -50])

    flat_ghi = [v for sublist in all_ghi for v in sublist]
    flat_temp = [v for sublist in all_temp for v in sublist]
    
    avg_ghi = sum(flat_ghi) / len(flat_ghi) if flat_ghi else 5.2
    avg_temp = sum(flat_temp) / len(flat_temp) if flat_temp else 25.0
    
    return {"ghi": round(avg_ghi, 3), "temp": round(avg_temp, 2)}

def pv_npv_metrics(annual_kwh_year1: float, capex_inr: float, opex_annual_inr: float) -> Dict:
    cash_flows = [-capex_inr]
    total_disc_energy = 0.0
    total_disc_costs = capex_inr
    
    npv = -capex_inr
    for t in range(1, PANEL_LIFETIME_YEARS + 1):
        gen = annual_kwh_year1 * ((1 - PANEL_DEGRADATION) ** (t - 1))
        opex = opex_annual_inr * ((1 + OPEX_ESCALATION) ** (t - 1))
        revenue = gen * GRID_TARIFF_INR_KWH
        net_cf = revenue - opex
        
        cash_flows.append(net_cf)
        npv += net_cf / ((1 + DISCOUNT_RATE) ** t)
        
        total_disc_energy += gen / ((1 + DISCOUNT_RATE) ** t)
        total_disc_costs += opex / ((1 + DISCOUNT_RATE) ** t)
        
    irr = calculate_irr(cash_flows)
    lcoe = total_disc_costs / total_disc_energy if total_disc_energy > 0 else 0
    
    return {
        "npv": round(npv, 2),
        "irr": round(irr * 100, 2),
        "lcoe": round(lcoe, 2)
    }

async def run_solar_analysis(lat: float, lng: float, area_m2: float, distribution: Dict[str, float]) -> Dict:
    # 1. Weather Data (GHI + Temp)
    weather = await get_solar_weather_expectation(lat, lng)
    ghi = weather["ghi"]
    temp = weather["temp"]

    # 2. Area & Capacity
    usable_fraction = sum(distribution.get(cat, 0.0) * frac for cat, frac in SOLAR_ELIGIBLE_FRACTION.items())
    usable_area_m2 = area_m2 * usable_fraction
    packing_density = 0.65
    panel_count = math.floor((usable_area_m2 * packing_density) / PANEL_AREA_M2)
    
    if panel_count == 0:
        return {"avg_daily_ghi_kwh_m2": ghi, "panel_count": 0, "npv_25yr_inr": 0}

    # BIFACIAL Fix: Capacity = count * area * eff (STC)
    # Corrected formula: count * 1.6 * 0.18 = count * 0.288 kWp
    capacity_kwp = panel_count * PANEL_AREA_M2 * PANEL_EFFICIENCY 

    # 3. Temperature Derating
    # P_actual = P_stc * [1 + Tc * (T_ambient + NOCT_offset - 25)]
    temp_derate_factor = max(0.5, 1.0 + TEMP_COEFF * (temp + NOCT_OFFSET - 25))
    
    # Year-1 Gen (kWh) = Capacity * GHI * 365 * Losses * TempDerate
    annual_gen_kwh = capacity_kwp * ghi * 365 * (1 - SYSTEM_LOSS_FACTOR) * temp_derate_factor
    
    # 4. Economics (including GST)
    base_capex = capacity_kwp * 1000 * CAPEX_PER_W_INR
    total_capex = base_capex * (1 + GST_RATE)
    opex_y1 = total_capex * OPEX_RATE
    
    metrics = pv_npv_metrics(annual_gen_kwh, total_capex, opex_y1)
    
    return {
        "avg_daily_ghi_kwh_m2":   ghi,
        "avg_temp_c":              temp,
        "usable_area_m2":          round(usable_area_m2, 2),
        "panel_count":             panel_count,
        "installed_capacity_kwp":  round(capacity_kwp, 2),
        "annual_generation_kwh":   round(annual_gen_kwh, 2),
        "annual_revenue_inr":      round(annual_gen_kwh * GRID_TARIFF_INR_KWH, 2),
        "total_investment_inr":    round(total_capex, 2),
        "annual_opex_inr":         round(opex_y1, 2),
        "payback_years":           round(total_capex / (annual_gen_kwh * GRID_TARIFF_INR_KWH - opex_y1), 1),
        "npv_25yr_inr":            metrics["npv"],
        "irr_pct":                 metrics["irr"],
        "lcoe_inr_kwh":            metrics["lcoe"],
        "temp_derate_factor":      round(temp_derate_factor, 3)
    }
