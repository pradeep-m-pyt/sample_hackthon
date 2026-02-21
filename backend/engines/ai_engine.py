import httpx
import os
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
MODEL        = "llama-3.3-70b-versatile"


def _fmt(v, prefix="₹", decimals=0) -> str:
    """Formats a number as a readable currency/metric string."""
    if v is None:
        return "N/A"
    try:
        number = round(float(v), decimals)
        if prefix:
            return f"{prefix}{number:,.{decimals}f}"
        return f"{number:,.{decimals}f}"
    except (TypeError, ValueError):
        return str(v)


def _safe(data: dict, key1: str, key2: str = None, default=0):
    """Safely extracts a value from nested dicts, returning default if missing."""
    try:
        val = data.get(key1)
        if key2 and isinstance(val, dict):
            val = val.get(key2)
        return val if val is not None else default
    except Exception:
        return default


SYSTEM_PROMPT = """
You are a Senior Ecosystem Valuation Analyst and Land-Use Investment Strategist with 20+ years
of experience in environmental finance, real-estate development, and climate-risk advisory in India.

Your job: produce a precise, data-driven investment recommendation report for a land parcel.
Use ONLY the numbers supplied below – never invent figures.
All costs follow CPWD DSR 2024, MNRE 2024, NMCG, and EPA 2023 benchmarks.

Format your response with these exact markdown sections:
1. ## Executive Summary  (4-5 sentences covering best strategy)
2. ## Cost & Investment Breakdown  (reference the cost_breakdown table provided)
3. ## Climate & Flood Risk Assessment
4. ## Solar Energy Potential
5. ## Carbon Sequestration & Credit Revenue
6. ## Scenario Comparison: Preserve vs Develop vs Hybrid  (include NPVs)
7. ## Strategic Recommendation  (**bold** the chosen action)
8. ## 10 / 20 / 30-Year Financial Outlook  (markdown table)
9. ## Risk Warnings & Mitigants

Be specific with ₹ amounts, payback periods, and ROI %. Tailor tone to the user's stated intent.
""".strip()


async def get_ai_recommendation(
    project_data: Dict,
    analysis_data: Dict,
) -> str:
    """
    Builds a comprehensive, data-complete prompt from all engine outputs and the
    full cost breakdown, then calls Groq LLM for a structured advisory report.
    """
    if not GROQ_API_KEY:
        return "AI Analysis unavailable – GROQ_API_KEY not set."

    fd  = analysis_data.get("flood_json",    {}) or {}
    sd  = analysis_data.get("solar_json",    {}) or {}
    cd  = analysis_data.get("carbon_json",   {}) or {}
    cb  = analysis_data.get("cost_breakdown",{}) or {}
    scn = analysis_data.get("scenarios",     {}) or {}

    area_m2 = _safe(project_data, "area_m2", default=0)
    annual_flood_val = _safe(fd, "annual_damage_avoided_inr_per_m2", default=0) * area_m2

    user_prompt = f"""
## LAND PARCEL DETAILS
| Field           | Value |
|-----------------|-------|
| Project Name    | {_safe(project_data, 'name', default='N/A')} |
| Area            | {area_m2:,.0f} m²  ·  {area_m2/10000:.3f} ha  ·  {area_m2/4046.86:.2f} acres |
| Dominant Cover  | {_safe(project_data, 'dominant_type', default='N/A')} |
| User Intent     | {_safe(project_data, 'user_intent', default='N/A')} |
| Elevation       | {_safe(project_data, 'elevation_m')} m ASL |
| Terrain Slope   | {_safe(project_data, 'slope_pct')} % |

---

## DEVELOPMENT COST MODEL  (CPWD DSR 2024 benchmarks)
| Cost Component              | Amount (₹) |
|-----------------------------|------------|
| Land Acquisition            | {_fmt(cb.get('land_acquisition_cost_inr'))} |
| Civil Construction          | {_fmt(cb.get('construction_cost_inr'))} |
| Infrastructure & Approvals  | {_fmt(cb.get('infrastructure_cost_inr'))} |
| Flood Mitigation / Drainage | {_fmt(cb.get('flood_mitigation_cost_inr'))} |
| **Total Project Cost**      | **{_fmt(cb.get('total_project_cost_inr'))}** |
| Gross Revenue (sale/lease)  | {_fmt(cb.get('gross_revenue_inr'))} |
| **Net Developer Profit**    | **{_fmt(cb.get('net_profit_inr'))}** |
| Profit Margin               | {cb.get('profit_margin_pct', 'N/A')} % |
| ROI                         | {cb.get('roi_pct', 'N/A')} % |
| Built-up Area (FSI applied) | {_fmt(cb.get('built_up_area_m2'), prefix='', decimals=0)} m² |

---

## FLOOD & CLIMATE RISK
| Metric                       | Value |
|------------------------------|-------|
| Annual Rainfall              | {_fmt(_safe(fd, 'annual_rainfall_mm'), prefix='', decimals=1)} mm/yr |
| SCS Curve Number (current)   | {_fmt(_safe(fd, 'cn_current'), prefix='', decimals=1)} |
| Runoff if Developed          | {_fmt(_safe(fd, 'runoff_developed_mm'), prefix='', decimals=1)} mm |
| Additional Runoff (delta)    | {_fmt(_safe(fd, 'delta_runoff_mm'), prefix='', decimals=1)} mm |
| Annual Flood-Damage Avoided  | {_fmt(annual_flood_val)} |
| Flood Risk Score             | {_safe(fd, 'flood_risk_score', default='N/A')} / 1.00  ({fd.get('risk_label', '')}) |

---

## SOLAR ENERGY POTENTIAL  (MNRE 2024 benchmarks, 9 % WACC)
| Metric                 | Value |
|------------------------|-------|
| Daily GHI (NASA POWER) | {_fmt(_safe(sd, 'avg_daily_ghi_kwh_m2'), prefix='', decimals=3)} kWh/m²/day |
| Installed Capacity     | {_fmt(_safe(sd, 'installed_capacity_kwp'), prefix='', decimals=1)} kWp |
| Year-1 Generation      | {_fmt(_safe(sd, 'annual_generation_kwh'), prefix='', decimals=0)} kWh |
| Annual Revenue         | {_fmt(_safe(sd, 'annual_revenue_inr'))} |
| Total Capex            | {_fmt(_safe(sd, 'total_investment_inr'))} |
| Annual O&M Cost        | {_fmt(_safe(sd, 'annual_opex_inr'))} |
| Simple Payback Period  | {_safe(sd, 'payback_years', default='N/A')} years |
| 25-Year NPV            | {_fmt(_safe(sd, 'npv_25yr_inr'))} |
| LCOE                   | {_fmt(_safe(sd, 'lcoe_inr_kwh'), prefix='₹', decimals=2)}/kWh |

---

## CARBON & ECOSYSTEM  (IPCC Tier-1; SCC = EPA 2023 $51/tCO₂ × ₹83)
| Metric                         | Value |
|--------------------------------|-------|
| Stored Carbon Stock            | {_fmt(_safe(cd, 'stored_co2_tons'), prefix='', decimals=1)} tCO₂ |
| Stock Value at SCC             | {_fmt(_safe(cd, 'stored_carbon_value_inr'))} |
| Annual Sequestration           | {_fmt(_safe(cd, 'annual_sequestration_co2_tons'), prefix='', decimals=2)} tCO₂/yr |
| Annual Credit Revenue (VCS)    | {_fmt(_safe(cd, 'annual_credit_revenue_inr'))} |
| 30-Yr NPV at SCC  (6 % DR)    | {_fmt(_safe(cd, 'npv_30yr_inr'))} |
| 30-Yr NPV at Market Credits    | {_fmt(_safe(cd, 'npv_30yr_market_inr'))} |

---

## SCENARIO SUMMARY
| Scenario   | 30-Year NPV | Notes |
|------------|-------------|-------|
| **Preserve**  | {_fmt(_safe(scn, 'preserve_npv30_inr'))} | Carbon credits + eco-tourism, no construction |
| **Develop**   | {_fmt(_safe(scn, 'develop_npv_inr'))}    | Full development profit (discounted 3-yr delivery) |
| **Hybrid**    | {_fmt(_safe(scn, 'hybrid_npv_inr'))}     | 40% eco + 40% dev + 20% solar optimised |

**Env NPV Total**: {_fmt(_safe(analysis_data, 'environmental_npv'))}
**Dev Net Profit**: {_fmt(_safe(analysis_data, 'financial_npv'))}
**Eco-Fin Score**:  {_safe(analysis_data, 'composite_score')} / 100

Please generate the full advisory report as structured above.
""".strip()

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "temperature": 0.55,
                    "max_tokens":  2048,
                },
            )

            res_data = response.json()

            if response.status_code != 200:
                err = res_data.get("error", {}).get("message", "Unknown error")
                print(f"Groq API Error {response.status_code}: {err}")
                return f"AI Provider Error ({response.status_code}): {err}"

            if "choices" not in res_data or not res_data["choices"]:
                print(f"Groq empty response: {res_data}")
                return "AI provider returned an empty response. Please try again."

            return res_data["choices"][0]["message"]["content"]

    except httpx.TimeoutException:
        return "AI Analysis timed out. The model is busy – please try again in a moment."
    except Exception as e:
        import traceback; traceback.print_exc()
        return f"Failed to generate AI recommendations: {str(e)}"
