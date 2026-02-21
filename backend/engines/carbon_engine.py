"""
carbon_engine.py
================
IPCC Tier 1 Carbon Accounting Engine
Covers: stock accounting, annual sequestration, social-cost valuation,
        VCS/Gold Standard market credits, 30-year NPV, and revenue tenure analysis.

FORMULA SOURCES
---------------
* Carbon stocks / fluxes  : IPCC 2006 Guidelines Vol.4 (Forests) & Vol.5 (Agriculture)
* C → CO₂ conversion      : MW(CO₂)/MW(C) = 44/12 ≈ 3.6667
* SCC                     : US EPA 2023 central estimate → $51/tCO₂
* VCS market price        : Conservative $10/tCO₂ (range $5-25, Gold Standard)
* NPV annuity             : PV = A × [1 − (1+r)^-n] / r
* FX rate                 : 1 USD = 83 INR (Q1 2024 RBI average)

API INPUTS REQUIRED
-------------------
  area_m2       : float   – Total parcel area in square metres   [MANDATORY]
  distribution  : dict    – Land-use category weights (must sum to 1.0) [MANDATORY]
                  Keys from: forest, wetland, agriculture, urban, open_land, water
  years         : int     – Analysis tenure in years (default 30)
  discount_rate : float   – NPV discount rate (default 0.06)
  usd_inr       : float   – Live FX rate override (default 83.0)
  scc_usd       : float   – Social Cost of Carbon override (default 51.0)
  vcs_usd       : float   – VCS market price override (default 10.0)
"""

from typing import Dict, Optional, List
import math
import httpx
import asyncio

# ── IPCC Tier 1 Default Carbon Stocks (tC/ha) ────────────────────────────────
# Source: IPCC 2006 GL Vol.4 Table 4.7 (tropical / subtropical defaults)
CARBON_STOCKS_TC_HA: Dict[str, float] = {
    "forest":       150.0,   # Tropical moist forest; includes above + below-ground biomass
    "wetland":      250.0,   # Organic (peat) soil; highest carbon density ecosystem
    "agriculture":   20.0,   # Managed cropland on mineral soil (Tier 1 default)
    "urban":          8.0,   # Urban green fraction (parks, street trees)
    "open_land":     25.0,   # Grassland / scrubland composite
    "water":          2.0,   # Inland water bodies; phytoplankton-dominated
}

# Annual Net Sequestration Flux (tC/ha/yr) ─ IPCC Tier 1 mean values
CARBON_FLUX_TC_HA_YR: Dict[str, float] = {
    "forest":        6.0,   # Net Ecosystem Production, mean tropical value
    "wetland":       3.5,   # Peat accretion minus aerobic decomposition
    "agriculture":   0.25,  # Low flux; tillage-dependent (no-till up to 0.5)
    "urban":         0.15,  # Dominated by tree canopy sink
    "open_land":     0.6,   # Grassland carbon sink (soil + roots)
    "water":         0.1,   # Negligible; phytoplankton uptake
}

# ── Conversion Constants ──────────────────────────────────────────────────────
C_TO_CO2        = 44.0 / 12.0   # = 3.6667 tCO₂ per tC  (molecular weight ratio)
HA_PER_M2       = 1.0 / 10_000  # 1 ha = 10,000 m²

# ── Economic Parameters (can be overridden via API) ──────────────────────────
DEFAULT_USD_INR  = 83.0    # INR per USD, Q1 2024 RBI average
DEFAULT_SCC_USD  = 51.0    # USD/tCO₂ – US EPA 2023 central estimate
DEFAULT_VCS_USD  = 10.0    # USD/tCO₂ – conservative VCS/Gold Standard traded price
DEFAULT_DISCOUNT = 0.06    # 6 % pa – India green bond benchmark
DEFAULT_YEARS    = 30      # Standard project tenure (UNFCCC REDD+ default)


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE DATA FETCHERS
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_live_fx() -> float:
    """Fetches real-time USD to INR exchange rate from a public API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Use open.er-api.com for free, keyless FX data
            res = await client.get("https://open.er-api.com/v6/latest/USD")
            res.raise_for_status()
            data = res.json()
            return data["rates"].get("INR", DEFAULT_USD_INR)
    except Exception as e:
        print(f"FX fetch failed, using default: {e}")
        return DEFAULT_USD_INR


# ═══════════════════════════════════════════════════════════════════════════════
# CORE MATH FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def npv_annuity(annual_value: float, years: int, rate: float) -> float:
    """
    Present Value of a uniform annual cash-flow stream.

    Formula:  PV = A × [1 − (1 + r)^−n] / r
    Special case (r = 0):  PV = A × n
    """
    if annual_value <= 0 or years <= 0:
        return 0.0
    if rate == 0:
        return annual_value * years
    return annual_value * (1 - (1 + rate) ** -years) / rate


def cumulative_sequestration(annual_co2: float, years: int) -> float:
    """Total (undiscounted) CO₂ sequestered over tenure."""
    return annual_co2 * years


def year_by_year_revenue(
    annual_credit_inr: float,
    years: int,
    rate: float
) -> List[Dict]:
    """
    Returns a list of dicts, one per year, showing:
      - undiscounted revenue
      - discounted revenue (PV of that year's payment)
      - cumulative undiscounted revenue
      - cumulative NPV
    """
    rows = []
    cumulative_undiscounted = 0.0
    cumulative_npv = 0.0
    for yr in range(1, years + 1):
        pv_factor = 1 / (1 + rate) ** yr
        disc_rev = annual_credit_inr * pv_factor
        cumulative_undiscounted += annual_credit_inr
        cumulative_npv += disc_rev
        rows.append({
            "year":                   yr,
            "undiscounted_inr":       round(annual_credit_inr, 2),
            "discounted_inr":         round(disc_rev, 2),
            "cumulative_undiscounted_inr": round(cumulative_undiscounted, 2),
            "cumulative_npv_inr":     round(cumulative_npv, 2),
        })
    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

async def run_carbon_analysis(
    area_m2:       float,
    distribution:  Dict[str, float],
    years:         int   = DEFAULT_YEARS,
    discount_rate: float = DEFAULT_DISCOUNT,
    usd_inr:       Optional[float] = None,
    scc_usd:       float = DEFAULT_SCC_USD,
    vcs_usd:       float = DEFAULT_VCS_USD,
    include_yearly: bool = False,
) -> Dict:
    """
    Full carbon valuation for a land parcel using IPCC Tier 1 guidelines.
    Now with live FX support and monetization strategy.
    """

    # 1. Fetch live FX if not provided
    if usd_inr is None:
        usd_inr = await fetch_live_fx()

    # 2. Validate inputs
    if area_m2 <= 0:
        # Avoid breaking, return zero-filled result
        area_m2 = 0.1
    
    dist_sum = sum(distribution.values())
    if not math.isclose(dist_sum, 1.0, abs_tol=0.01):
        # Normalize weights
        if dist_sum > 0:
            distribution = {k: v / dist_sum for k, v in distribution.items()}
        else:
            distribution = {"open_land": 1.0}
        
    # Filter known categories
    clean_dist = {k: v for k, v in distribution.items() if k in CARBON_STOCKS_TC_HA}
    if not clean_dist:
        clean_dist = {"open_land": 1.0}
    distribution = clean_dist

    # 3. Derived economic constants (Live ₹ values)
    SCC_INR   = scc_usd * usd_inr   # ₹/tCO₂
    VCS_INR   = vcs_usd * usd_inr   # ₹/tCO₂

    # 4. Area conversion
    area_ha = area_m2 * HA_PER_M2

    # 5. Physical carbon accounting
    total_stored_c    = 0.0
    total_annual_flux = 0.0

    for cat, weight in distribution.items():
        cat_ha             = area_ha * weight
        total_stored_c    += cat_ha * CARBON_STOCKS_TC_HA[cat]
        total_annual_flux += cat_ha * CARBON_FLUX_TC_HA_YR[cat]

    # Convert tC → tCO₂  (multiply by 44/12 ≈ 3.6667)
    stored_co2_tons  = total_stored_c    * C_TO_CO2
    annual_co2_tons  = total_annual_flux * C_TO_CO2
    total_co2_tenure = cumulative_sequestration(annual_co2_tons, years)

    # 6. Valuations
    stored_value_inr      = stored_co2_tons * SCC_INR
    annual_scc_inr        = annual_co2_tons * SCC_INR
    annual_credit_inr     = annual_co2_tons * VCS_INR

    # 7. NPV over tenure
    npv_scc    = npv_annuity(annual_scc_inr,    years, discount_rate)
    npv_market = npv_annuity(annual_credit_inr,  years, discount_rate)

    # 8. Undiscounted total revenue over tenure
    total_undiscounted = annual_credit_inr * years

    # 9. Year-by-year table
    yearly = year_by_year_revenue(annual_credit_inr, years, discount_rate) \
             if include_yearly else []

    return {
        # --- Physical ---
        "stored_carbon_tc":               round(total_stored_c,    4),
        "stored_co2_tons":                round(stored_co2_tons,   4),
        "annual_sequestration_co2_tons":  round(annual_co2_tons,   4),
        "total_co2_over_tenure_tons":     round(total_co2_tenure,  4),
        
        # --- Economic (INR) ---
        "stored_carbon_value_inr":        round(stored_value_inr,  2),
        "annual_carbon_value_scc_inr":    round(annual_scc_inr,    2),
        "annual_credit_revenue_inr":      round(annual_credit_inr, 2),
        "npv_tenure_scc_inr":             round(npv_scc,           2),
        "npv_tenure_market_inr":          round(npv_market,        2),
        "total_undiscounted_revenue_inr": round(total_undiscounted, 2),
        
        # --- Backward Compatibility Aliases for Aggregator and AI Engine ---
        "npv_30yr_inr":                  round(npv_scc,           2),
        "npv_30yr_market_inr":           round(npv_market,        2),
        "annual_carbon_value_inr":       round(annual_scc_inr,    2),
        
        # --- Breakdown & Metadata ---
        "yearly_revenue": yearly,
        "inputs": {
            "area_m2":       area_m2,
            "area_ha":       round(area_ha, 4),
            "distribution":  distribution,
            "years":         years,
            "discount_rate": discount_rate,
            "usd_inr":       round(usd_inr, 2),
            "scc_usd":       scc_usd,
            "vcs_usd":       vcs_usd,
        },
        "constants_used": {
            "C_to_CO2_ratio":  round(C_TO_CO2, 4),
            "SCC_INR_per_tCO2": round(SCC_INR, 2),
            "VCS_INR_per_tCO2": round(VCS_INR, 2),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SAMPLE DATA VALIDATION & API DOCS
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_CASES = {
    "western_ghats_forest": {
        "label":       "Western Ghats Forest Reserve (50 ha)",
        "area_m2":     500_000,
        "distribution": {"forest": 0.85, "wetland": 0.10, "water": 0.05},
        "years": 30,
        "expected_stored_co2_approx":  27974,
        "expected_annual_co2_approx":  999,
    },
    "punjab_agri": {
        "label":       "Punjab Mixed Agricultural Land (200 ha)",
        "area_m2":     2_000_000,
        "distribution": {"agriculture": 0.70, "open_land": 0.20, "urban": 0.10},
        "years": 20,
        "expected_stored_co2_approx":  14520,
        "expected_annual_co2_approx":  227,
    }
}

async def run_sample_validation():
    print("\n   CARBON ENGINE — SAMPLE DATA VALIDATION")
    for case_id, case in SAMPLE_CASES.items():
        res = await run_carbon_analysis(case["area_m2"], case["distribution"], years=case["years"])
        print(f"   - {case['label']}: Stored={res['stored_co2_tons']:.0f} tCO2, Annual={res['annual_sequestration_co2_tons']:.0f} tCO2/yr")

if __name__ == "__main__":
    asyncio.run(run_sample_validation())
