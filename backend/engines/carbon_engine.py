from typing import Dict

# ── IPCC Tier 1 Default Carbon Stocks & Fluxes ──────────────────────────────
# Source: IPCC 2006 GL Vol. 4 (Forests) & Vol. 5 (Agriculture)
# Units: tons of Carbon per hectare (tC/ha)
CARBON_STOCKS_TC_HA: Dict[str, float] = {
    "forest":      150.0,  # Tropical moist / subtropical default (tC/ha)
    "wetland":     250.0,  # Organic soils: highest C density
    "agriculture":  20.0,  # Managed cropland, mineral soil
    "urban":         8.0,  # Urban green fraction
    "open_land":    25.0,  # Grassland / scrub
    "water":         2.0,  # Aquatic – minimal above-ground stock
}

# Annual net sequestration flux (tC/ha/yr)  —  IPCC Tier 1
CARBON_FLUX_TC_HA_YR: Dict[str, float] = {
    "forest":       6.0,   # Net ecosystem production, mean tropical value
    "wetland":      3.5,   # Peat accretion minus decomposition
    "agriculture":  0.25,  # Low; depends on tillage type
    "urban":        0.15,  # Street trees + parks
    "open_land":    0.6,   # Grassland sink
    "water":        0.1,   # Phytoplankton; negligible for inland
}

# CO₂ molecular weight ratio: 1 tC = 3.667 tCO₂
C_TO_CO2 = 44 / 12

# Social Cost of Carbon (SCC): EPA 2023 central estimate – USD 51/tCO₂
# FX: 1 USD ≈ 83 INR (Q1 2024 average)
SCC_INR_PER_TCO2 = 51.0 * 83.0  # ₹4,233/tCO₂

# Verified Carbon Standard (VCS) / Gold Standard market price per tCO₂
# Range: $5–25; using conservative ₹830 ($10) for traded carbon credit value
VCS_CREDIT_INR_TCO2 = 10.0 * 83.0  # ₹830/tCO₂

# Discount rate for NPV calculations (government infrastructure benchmark)
DISCOUNT_RATE = 0.06  # 6 % pa (India green bond market rate)
NPV_YEARS     = 30


def npv_series(annual_value: float, years: int, discount_rate: float) -> float:
    """Discounted Cash Flow NPV of a uniform annual benefit stream."""
    if annual_value <= 0:
        return 0.0
    # Annuity formula: PV = A × [1 − (1 + r)^−n] / r
    if discount_rate == 0:
        return annual_value * years
    return annual_value * (1 - (1 + discount_rate) ** -years) / discount_rate


async def run_carbon_analysis(area_m2: float, distribution: Dict[str, float]) -> Dict:
    """
    Full carbon valuation for a land parcel:
      1. Stock accounting (tCO₂ already stored in soil/biomass)
      2. Annual sequestration flux (tCO₂/yr)
      3. Social-cost-of-carbon value of stored stock (₹)
      4. Annual carbon-credit revenue at VCS market rate (₹/yr)
      5. 30-year NPV of sequestration stream at 6 % discount rate (₹)

    Returns all quantities needed by the aggregator and AI engine.
    """
    area_ha = area_m2 / 10_000.0

    total_stored_c    = 0.0
    total_annual_flux = 0.0

    for cat, weight in distribution.items():
        cat_ha             = area_ha * weight
        total_stored_c    += cat_ha * CARBON_STOCKS_TC_HA.get(cat, 10.0)
        total_annual_flux += cat_ha * CARBON_FLUX_TC_HA_YR.get(cat, 0.2)

    # Convert carbon to CO₂ equivalent
    stored_co2_tons   = total_stored_c   * C_TO_CO2
    annual_co2_tons   = total_annual_flux * C_TO_CO2

    # ── Valuations ────────────────────────────────────────────────────────
    # Stock value at social cost of carbon (one-off avoided emission equivalent)
    stored_value_inr  = stored_co2_tons  * SCC_INR_PER_TCO2

    # Annual credit revenue (market-traded VCS price, conservative)
    annual_credit_inr = annual_co2_tons  * VCS_CREDIT_INR_TCO2

    # Annual value at social cost (policy / regulatory value)
    annual_scc_inr    = annual_co2_tons  * SCC_INR_PER_TCO2

    # 30-yr NPV of sequestration at market carbon-credit price
    npv_30yr_market   = npv_series(annual_credit_inr, NPV_YEARS, DISCOUNT_RATE)

    # 30-yr NPV at social cost (used in environmental NPV aggregation)
    npv_30yr_scc      = npv_series(annual_scc_inr, NPV_YEARS, DISCOUNT_RATE)

    return {
        # Physical quantities
        "stored_carbon_tc":              round(total_stored_c,    2),
        "stored_co2_tons":               round(stored_co2_tons,   2),
        "annual_sequestration_co2_tons": round(annual_co2_tons,   2),
        # Economic quantities
        "stored_carbon_value_inr":       round(stored_value_inr,  2),
        "annual_carbon_value_inr":       round(annual_scc_inr,    2),  # SCC-based
        "annual_credit_revenue_inr":     round(annual_credit_inr, 2),  # Market-based
        "npv_30yr_inr":                  round(npv_30yr_scc,      2),  # For aggregator
        "npv_30yr_market_inr":           round(npv_30yr_market,   2),
    }
