"""
aggregator.py – Production-Grade Financial & Environmental Aggregator
─────────────────────────────────────────────────────────────────────
All cost benchmarks are sourced from:
  • CREDAI / Knight Frank India Land-Price Index 2024 (land acquisition)
  • CPWD DSR 2024 (civil construction costs)
  • CERC / MNRE 2024 (solar installation benchmarks)
  • NMCG & CPCB (stormwater treatment costs)
  • EPA 2023 + VCS market (carbon valuation)
  • RBI 2024 WACC / Green-bond rates
"""

from typing import Dict
import math

# ── Discount Rates ────────────────────────────────────────────────────────────
INFRA_DR    = 0.09   # 9 % – real-estate / infrastructure WACC (RBI 2024)
ECO_DR      = 0.06   # 6 % – green-bond rate for environmental benefits
SOLAR_DR    = 0.09   # matches solar engine NPV

# ── Land Acquisition Costs by intent (₹/m²) ─────────────────────────────────
# Regional averages for peri-urban / rural India (Knight Frank 2024)
# These apply to purchasing the raw land at market rate
LAND_COST_INR_M2: Dict[str, float] = {
    "housing":     2_500,    # Peri-urban residential land
    "industry":    1_800,    # Industrial corridor benchmarks
    "solar":         600,    # Barren / semi-arid land for solar farms
    "agriculture":   400,    # Agricultural zone land
    "preserve":      200,    # Conservation buffer / forest land
    "mixed":       2_000,    # Mixed-use peri-urban average
}

# ── Construction / Development Costs (₹/m² of built-up area) ────────────────
# Source: CPWD Delhi—Schedule of Rates 2024 (adjusted for states)
CONSTRUCTION_COST_INR_M2: Dict[str, float] = {
    "housing":    25_000,    # G+3 residential, including finishes & MEP
    "industry":   18_000,    # Industrial shed / factory
    "solar":           0,    # Capex handled in solar_engine
    "agriculture":   500,    # Irrigation, levelling, fencing, poly-house
    "preserve":      200,    # Trail, signage, low-impact infrastructure
    "mixed":      20_000,    # Average of residential + commercial
}

# ── FAR / FSI (Floor Area Ratio) by intent ───────────────────────────────────
# How much built-up area can be created per m² of land
FSI: Dict[str, float] = {
    "housing":     1.5,      # Typical Indian peri-urban FSI
    "industry":    1.0,
    "solar":       0.0,      # Solar doesn't have FSI
    "agriculture": 0.05,     # Only farm structures
    "preserve":    0.01,     # Only conservation structures
    "mixed":       2.0,
}

# ── Sale / Lease Revenue per m² of built-up area (₹/m²) ────────────────────
# What the developer sells or leases the constructed area at
SALE_PRICE_INR_M2: Dict[str, float] = {
    "housing":    55_000,    # ₹55k/m² semi-urban residential selling price
    "industry":   30_000,    # Industrial lease value capitalised
    "solar":           0,    # Revenue tracked in solar NPV
    "agriculture":  2_000,   # Capitalised farm income over project life
    "preserve":    1_000,    # Eco-tourism entry + grant capitalised
    "mixed":      45_000,
}

# ── Infrastructure & Regulatory Costs (% of construction cost) ───────────────
# Covers: road, water/sewage connection, electricity grid, statutory approvals
INFRA_OVERHEADS: Dict[str, float] = {
    "housing":    0.20,
    "industry":   0.25,
    "solar":      0.10,
    "agriculture": 0.08,
    "preserve":   0.05,
    "mixed":      0.22,
}

# ── Developer Profit Margin ────────────────────────────────────────────────
# Industry standard: 20 % on total project cost (NCLT / RERA disclosures)
DEVELOPER_MARGIN = 0.20

# ── Stormwater / Flood Infrastructure Cost ───────────────────────────────────
# If the land is high-risk, developer must invest in drainage
# Source: NMCG Integrated Flood Management cost norms 2023
DRAINAGE_COST_INR_M3_RUNOFF = 120.0  # ₹/m³ of additional runoff managed


def _npv_annuity(annual_value: float, years: int, rate: float) -> float:
    """PV of a level annual cash-flow stream at given discount rate."""
    if annual_value <= 0 or years <= 0:
        return 0.0
    if rate == 0:
        return annual_value * years
    return annual_value * (1 - (1 + rate) ** -years) / rate


def _development_cost_breakdown(
    area_m2: float,
    intent: str,
    flood_runoff_delta_mm: float,
    flood_risk_score: float,
) -> Dict:
    """
    Computes a detailed, phase-wise development cost model for the land parcel.

    Returns:
      land_acq_cost       – market cost to acquire the raw land
      construction_cost   – civil works cost
      infra_cost          – roads, utilities, approvals
      flood_mitigation    – drainage investment (if high risk)
      total_project_cost  – all-in cost before margin
      gross_revenue       – sale / lease revenue
      net_profit          – gross revenue − total cost
      profit_margin_pct   – net profit / gross revenue (%)
      roi_pct             – return on investment = profit / cost
    """
    intent_key = intent.lower() if intent.lower() in LAND_COST_INR_M2 else "mixed"

    # 1. Land Acquisition
    land_cost = area_m2 * LAND_COST_INR_M2[intent_key]

    # 2. Built-up area possible
    built_up_m2 = area_m2 * FSI[intent_key]

    # 3. Construction
    construction = built_up_m2 * CONSTRUCTION_COST_INR_M2[intent_key]

    # 4. Infrastructure overheads
    infra = construction * INFRA_OVERHEADS[intent_key]

    # 5. Flood mitigation investment (proportional to risk & additional runoff)
    if flood_risk_score > 0.35:
        drainage_vol_m3 = (flood_runoff_delta_mm / 1000.0) * area_m2
        flood_mit_cost = drainage_vol_m3 * DRAINAGE_COST_INR_M3_RUNOFF
    else:
        flood_mit_cost = 0.0

    total_cost = land_cost + construction + infra + flood_mit_cost

    # 6. Revenue
    gross_revenue = built_up_m2 * SALE_PRICE_INR_M2[intent_key]

    # 7. Profit
    net_profit = gross_revenue - total_cost
    profit_margin_pct = (net_profit / gross_revenue * 100) if gross_revenue > 0 else 0.0
    roi_pct = (net_profit / total_cost * 100) if total_cost > 0 else 0.0

    return {
        "land_acquisition_cost_inr":  round(land_cost,         2),
        "built_up_area_m2":           round(built_up_m2,       2),
        "construction_cost_inr":      round(construction,      2),
        "infrastructure_cost_inr":    round(infra,             2),
        "flood_mitigation_cost_inr":  round(flood_mit_cost,    2),
        "total_project_cost_inr":     round(total_cost,        2),
        "gross_revenue_inr":          round(gross_revenue,     2),
        "net_profit_inr":             round(net_profit,        2),
        "profit_margin_pct":          round(profit_margin_pct, 1),
        "roi_pct":                    round(roi_pct,           1),
    }


async def aggregate_analysis(
    area_m2: float,
    flood_data: Dict,
    solar_data: Dict,
    carbon_data: Dict,
    user_intent: str,
) -> Dict:
    """
    Master aggregator:
      1. Computes environmental NPV (flood + solar + carbon)
      2. Builds a full cost-of-development model
      3. Computes three scenario NPVs (Preserve / Develop / Hybrid)
      4. Assigns a 0-100 composite decision score
    """
    intent = user_intent.lower() if user_intent else "mixed"

    # ── A. Environmental NPVs ─────────────────────────────────────────────
    annual_flood_val = (
        flood_data.get("annual_damage_avoided_inr_per_m2", 0.0) * area_m2
    )
    flood_npv   = _npv_annuity(annual_flood_val, 30, ECO_DR)
    solar_npv   = solar_data.get("npv_25yr_inr", 0.0)
    carbon_npv  = (
        carbon_data.get("npv_30yr_inr", 0.0)
        + carbon_data.get("stored_carbon_value_inr", 0.0)
    )
    total_env_npv = flood_npv + solar_npv + carbon_npv

    # ── B. Development Cost Model ─────────────────────────────────────────
    dev_costs = _development_cost_breakdown(
        area_m2        = area_m2,
        intent         = intent,
        flood_runoff_delta_mm = flood_data.get("delta_runoff_mm", 0.0),
        flood_risk_score      = flood_data.get("flood_risk_score", 0.3),
    )
    net_profit = dev_costs["net_profit_inr"]

    # ── C. Three Scenario NPVs ────────────────────────────────────────────

    # PRESERVE: Carbon credits + eco-tourism, no construction
    preserve_annual = (
        carbon_data.get("annual_credit_revenue_inr", 0.0)
        + area_m2 * 0.5          # ₹0.5/m²/yr eco-tourism gate fee estimate
        + annual_flood_val * 0.5  # 50 % of flood-damage-avoided value
    )
    preserve_npv30 = _npv_annuity(preserve_annual, 30, ECO_DR)

    # DEVELOP: one-time net profit (assumed realised end of year 3)
    # Discounted back 3 years at infra rate — production-grade timing
    develop_npv = dev_costs["net_profit_inr"] / ((1 + INFRA_DR) ** 3)

    # HYBRID: 40 % land preserve + 40 % construction + 20 % solar
    hybrid_preserve_share = preserve_npv30 * 0.40
    hybrid_dev_share      = develop_npv   * 0.40
    hybrid_solar_share    = solar_npv     * 0.80  # Solar on 80 % of eligible area
    hybrid_carbon_share   = carbon_npv   * 0.40
    hybrid_npv = hybrid_preserve_share + hybrid_dev_share + hybrid_solar_share + hybrid_carbon_share

    # ── D. Composite Eco-Fin Score (0-100) ────────────────────────────────
    # Benchmarks (50th percentile India project sizes)
    ECO_REF = 5_000_000    # ₹50 L env NPV = full 40 pts
    FIN_REF = 50_000_000   # ₹5 Cr  dev profit = full 40 pts
    flood_risk = flood_data.get("flood_risk_score", 0.5)

    eco_pts  = min(1.0, total_env_npv / ECO_REF)  * 40
    fin_pts  = min(1.0, max(0, net_profit) / FIN_REF) * 40
    risk_pts = (1 - flood_risk) * 20

    composite_score = round(eco_pts + fin_pts + risk_pts, 1)

    return {
        # Top-level KPIs used by frontend
        "environmental_npv":  round(total_env_npv, 2),
        "financial_npv":      round(net_profit, 2),
        "composite_score":    composite_score,

        # Full cost breakdown (new — used in AI engine + detailed frontend)
        "cost_breakdown": dev_costs,

        # Component NPVs
        "metrics": {
            "flood_avoided_npv_inr":  round(flood_npv, 2),
            "solar_npv_inr":          round(solar_npv, 2),
            "carbon_npv_inr":         round(carbon_npv, 2),
            "annual_flood_value_inr": round(annual_flood_val, 2),
        },

        # Scenarios
        "scenarios": {
            "preserve_npv30_inr":  round(preserve_npv30, 2),
            "develop_npv_inr":     round(develop_npv, 2),
            "hybrid_npv_inr":      round(hybrid_npv, 2),
        },

        "indicators": {
            "is_eco_dominant":   total_env_npv > abs(net_profit) * 0.5,
            "is_high_risk":      flood_risk > 0.7,
            "is_solar_viable":   solar_data.get("npv_25yr_inr", 0) > 0,
            "is_profitable":     net_profit > 0,
            "roi_pct":           dev_costs["roi_pct"],
        },
    }
