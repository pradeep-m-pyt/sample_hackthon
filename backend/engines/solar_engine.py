import httpx
import math
from typing import Dict

# NASA POWER solar irradiance endpoint
NASA_POWER_SOLAR_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"

# ── Panel Specifications ─────────────────────────────────────────────────────
PANEL_AREA_M2        = 2.0      # Standard 400W panel footprint
PANEL_CAPACITY_KW    = 0.4      # 400 Wp per panel
SYSTEM_EFFICIENCY    = 0.77     # PR (Performance Ratio) – IEC 61724 typical
PANEL_DEGRADATION    = 0.005    # 0.5 % annual output degradation (industry standard)
PANEL_LIFETIME_YEARS = 25       # Bankable project life

# ── Industry-standard Indian Solar Economics ─────────────────────────────────
CAPEX_PER_KWP_INR    = 55_000   # ₹55 k/kWp (approx. 2024 utility-scale India)
OPEX_RATE            = 0.01     # 1 % of Capex per year (O&M)
GRID_TARIFF_INR_KWH  = 4.75    # ₹/kWh (average industrial + commercial FiT, 2024)
DISCOUNT_RATE        = 0.09     # 9 % WACC for renewable projects in India

# Which land types are eligible for ground-mounted solar panels
SOLAR_ELIGIBLE_FRACTION: Dict[str, float] = {
    "open_land":   1.00,
    "agriculture": 0.40,   # Agrivoltaic – panels above crops
    "urban":       0.25,   # Rooftop fraction
    "forest":      0.00,
    "wetland":     0.00,
    "water":       0.05,   # Floating solar
}


async def get_ghi_kwh_m2_day(lat: float, lng: float) -> float:
    """
    Fetches Global Horizontal Irradiance (GHI) from NASA POWER.
    Returns monthly-averaged daily GHI (kWh/m²/day) averaged over 2022-2023.
    Falls back to 5.0 kWh/m²/day if API is unavailable.
    """
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN",   # GHI in Wh/m²/day
        "community": "RE",
        "longitude": str(lng),
        "latitude":  str(lat),
        "format": "JSON",
        "start": "2022",
        "end": "2023",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(NASA_POWER_SOLAR_URL, params=params)
            data = res.json()
        monthly = data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
        # Values are in Wh/m²/day → convert to kWh
        values = [v / 1000.0 for v in monthly.values() if v and v > 0]
        return round(sum(values) / len(values), 3) if values else 5.0
    except Exception as e:
        print(f"NASA POWER solar error: {e}")
        return 5.0  # Conservative default for India


def pv_npv(
    annual_kwh_year1: float,
    capex_inr: float,
    opex_annual_inr: float,
    tariff: float = GRID_TARIFF_INR_KWH,
    years: int = PANEL_LIFETIME_YEARS,
    discount_rate: float = DISCOUNT_RATE,
    degradation: float = PANEL_DEGRADATION,
) -> float:
    """
    Net Present Value of the solar installation over its lifetime.
    Accounts for annual production degradation and O&M costs.
    """
    npv = -capex_inr  # Initial investment is an outflow
    for t in range(1, years + 1):
        generation = annual_kwh_year1 * ((1 - degradation) ** (t - 1))
        revenue    = generation * tariff
        cash_flow  = revenue - opex_annual_inr
        npv       += cash_flow / ((1 + discount_rate) ** t)
    return round(npv, 2)


async def run_solar_analysis(
    lat: float,
    lng: float,
    area_m2: float,
    distribution: Dict[str, float],
) -> Dict:
    """
    Full solar potential analysis:
      1. Fetch real GHI from NASA POWER
      2. Determine usable area by land-cover eligibility
      3. Calculate panel count, generation & economics
      4. Compute lifetime NPV with degradation and O&M
    """
    ghi_kwh_m2_day = await get_ghi_kwh_m2_day(lat, lng)

    # 1. Usable area
    usable_fraction = sum(
        distribution.get(cat, 0.0) * frac
        for cat, frac in SOLAR_ELIGIBLE_FRACTION.items()
    )
    usable_area_m2 = area_m2 * usable_fraction

    # 2. Panel count (60 % packing density on usable area)
    packing_density = 0.60
    panel_count = math.floor((usable_area_m2 * packing_density) / PANEL_AREA_M2)

    if panel_count == 0:
        return {
            "avg_daily_ghi_kwh_m2": ghi_kwh_m2_day,
            "usable_area_m2": 0,
            "panel_count": 0,
            "installed_capacity_kwp": 0,
            "annual_generation_kwh": 0,
            "annual_revenue_inr": 0,
            "total_investment_inr": 0,
            "annual_opex_inr": 0,
            "payback_years": None,
            "npv_25yr_inr": 0,
            "lcoe_inr_kwh": None,
        }

    installed_kwp = panel_count * PANEL_CAPACITY_KW

    # 3. Year-1 generation (kWh)
    annual_gen_kwh = (
        installed_kwp * ghi_kwh_m2_day * 365 * SYSTEM_EFFICIENCY
    )

    # 4. Economics
    capex_inr  = installed_kwp * CAPEX_PER_KWP_INR
    opex_inr   = capex_inr * OPEX_RATE
    annual_rev = annual_gen_kwh * GRID_TARIFF_INR_KWH

    payback = (
        capex_inr / (annual_rev - opex_inr)
        if (annual_rev - opex_inr) > 0 else None
    )

    npv = pv_npv(annual_gen_kwh, capex_inr, opex_inr)

    # LCOE (₹/kWh) – sum of discounted costs / sum of discounted energy
    total_disc_energy = sum(
        annual_gen_kwh * ((1 - PANEL_DEGRADATION) ** (t - 1)) / ((1 + DISCOUNT_RATE) ** t)
        for t in range(1, PANEL_LIFETIME_YEARS + 1)
    )
    total_disc_cost = capex_inr + sum(
        opex_inr / ((1 + DISCOUNT_RATE) ** t)
        for t in range(1, PANEL_LIFETIME_YEARS + 1)
    )
    lcoe = round(total_disc_cost / total_disc_energy, 2) if total_disc_energy > 0 else None

    return {
        "avg_daily_ghi_kwh_m2":   ghi_kwh_m2_day,
        "usable_area_m2":          round(usable_area_m2, 2),
        "panel_count":             panel_count,
        "installed_capacity_kwp":  round(installed_kwp, 2),
        "annual_generation_kwh":   round(annual_gen_kwh, 2),
        "annual_revenue_inr":      round(annual_rev, 2),
        "total_investment_inr":    round(capex_inr, 2),
        "annual_opex_inr":         round(opex_inr, 2),
        "payback_years":           round(payback, 1) if payback else None,
        "npv_25yr_inr":            npv,
        "lcoe_inr_kwh":            lcoe,
    }
