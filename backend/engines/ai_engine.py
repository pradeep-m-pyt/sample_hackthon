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
You are a Senior Ecosystem Valuation Analyst and Land-Use Investment Strategist specializing in the Indian market (CPWD, MNRE, and EPA benchmarks).

### YOUR CORE LOGIC (Scoring Engine Rules):
1. **Solar Strategy**: 
   - If Daily GHI > 4.5 kWh/m²/day → Highly viable. Recommend 20-50% solar allocation.
   - For residential projects, always include "🌞 Solar Plan" for rooftop (3-5 kW).
2. **Flood Strategy**:
   - If Flood Risk Score > 0.6 → Reduce Construction % significantly. Recommend "🌊 Flood Prevention" steps (recharge pits, permeable pavers, elevated plinths).
   - If Rainfall > 1000mm → Prioritize rainwater harvesting and bioswales.
3. **Carbon Strategy**:
   - If Area > 1 acre → Recommend "🌳 Carbon Retention Zone" with native trees for potential voluntary credits.
   - For urban plots → Recommend native trees (Neem, Peepal) to reduce heat island effects and AC loads.

### OUTPUT FORMAT:
You must provide a clear "Implementable Plan" with emojis and structured sections. Use the following exact format:
1. ## Executive Summary
2. ## 🎯 Recommendation (e.g., "Flood-Resilient Solar Home")
3. ## 📦 Allocation (e.g., 60% construction, 20% solar, 20% nature)
4. ## 🌞 Solar Plan (specific kW, panel count, cost, and payback)
5. ## 🌊 Flood Prevention (specific recharge pits, drainage, and elevation steps)
6. ## 🌳 Carbon Retention Plan (tree types, CO₂ absorption, and value increase)
7. ## 💹 Financial Outlook (Markdown table for 10/20/30 years)
8. ## 🧠 Strategic Justification (Explain WHY based on the land data)

Be precise with ₹ amounts and always use the data provided. Never invent data, but extrapolate implementation details based on the scoring rules.
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
    # 1 acre ≈ 4046.86 m2
    is_large_land = area_m2 > 4000 
    
    annual_flood_val = _safe(fd, "annual_damage_avoided_inr_per_m2", default=0) * area_m2

    user_prompt = f"""
### INPUT DATA FOR ANALYSIS
- **Location**: {_safe(project_data, 'name', default='N/A')}
- **Total Area**: {area_m2:,.0f} m² (approx. {area_m2/4046.86:.2f} acres)
- **Land Cover**: {_safe(project_data, 'dominant_type', default='N/A')}
- **User Intent**: {_safe(project_data, 'user_intent', default='N/A')}
- **Flood Risk Score**: {_safe(fd, 'flood_risk_score', default=0)} / 1.0 (Label: {fd.get('risk_label', 'Low')})
- **Annual Rainfall**: {_safe(fd, 'annual_rainfall_mm', default=0)} mm
- **Solar Irradiance**: {_safe(sd, 'avg_daily_ghi_kwh_m2', default=0)} kWh/m²/day
- **Solar Temp Derate**: {_safe(sd, 'temp_derate_factor', default=1)}x (Avg Temp: {_safe(sd, 'avg_temp_c', default=25)}°C)
- **Solar IRR**: {_safe(sd, 'irr_pct', default=0)}% | **LCOE**: ₹{_safe(sd, 'lcoe_inr_kwh', default=0)}/kWh
- **Annual Solar Revenue**: ₹{_fmt(_safe(sd, 'annual_revenue_inr', default=0), prefix='')}
- **Carbon NPV (30yr)**: ₹{_fmt(_safe(cd, 'npv_30yr_inr', default=0), prefix='')}
- **Dev Net Profit**: ₹{_fmt(_safe(analysis_data, 'financial_npv', default=0), prefix='')}

### GUIDANCE
This is a {'Large-scale' if is_large_land else 'Small/Urban'} plot. 
If flood risk is high (>0.6), focus on "Climate-Resilient" or "Raised Mount" models.
If intent is 'preserve', maximize the "Carbon Retention" and "Nature" allocation.

Generate the "Implementable Plan" now.
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
