import httpx
import os
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def get_ai_recommendation(
    project_data: Dict,
    analysis_data: Dict
) -> str:
    if not GROQ_API_KEY:
        return "AI Analysis unavailable (Missing API Key)."

    system_prompt = """
    You are an expert ecosystem valuation consultant and land-use advisor.
    Give specific, actionable recommendations for the provided land data.
    Format as: Overview → Flood Risk → Solar Potential → Carbon → Best Strategy → Monetization Timeline → Risk Warnings
    Be concise, use ₹ values, and mention ROI timeframes. 
    Tailor your tone to the user's intent (e.g., Housing vs Preserve).
    Provide a prediction for the next 10, 20, and 30 years regarding climate impact and economic returns.
    """

    # Safeguard: Ensure values are not None before formatting with commas
    def safe_val(data, key1, key2=None, default=0):
        try:
            val = data.get(key1)
            if key2 and isinstance(val, dict):
                val = val.get(key2)
            return val if val is not None else default
        except:
            return default

    user_prompt = f"""
    LAND DATA:
    - Name: {safe_val(project_data, 'name', default='N/A')}
    - Area: {safe_val(project_data, 'area_m2'):,} m2
    - Dominant Type: {safe_val(project_data, 'dominant_type', default='N/A')}
    - Intent: {safe_val(project_data, 'user_intent', default='N/A')}
    - Elevation: {safe_val(project_data, 'elevation_m')}m, Slope: {safe_val(project_data, 'slope_pct')}%
    
    ENVIRONMENTAL ANALYSIS:
    - Flood Risk Score: {safe_val(analysis_data, 'flood_json', 'flood_risk_score')}
    - Solar Revenue (Annual): ₹{safe_val(analysis_data, 'solar_json', 'annual_revenue_inr'):,}
    - Solar Payback: {safe_val(analysis_data, 'solar_json', 'payback_years')} years
    - Carbon Capture (Annual): {safe_val(analysis_data, 'carbon_json', 'annual_sequestration_co2_tons')} tons CO2
    - Carbon NPV (30yr): ₹{safe_val(analysis_data, 'carbon_json', 'npv_30yr_inr'):,}
    
    FINANCIAL SUMMARY:
    - Environmental NPV: ₹{safe_val(analysis_data, 'environmental_npv'):,}
    - Development Financial Projection: ₹{safe_val(analysis_data, 'financial_npv'):,}
    - Composite Eco-Fin Score: {safe_val(analysis_data, 'composite_score')}/100

    Please provide a detailed report following the prescribed format. Focus on hybrid approaches (e.g., 30% solar, 70% housing) that maximize both profit and nature value.
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7
                },
                timeout=60.0 # Increased timeout
            )
            
            res_data = response.json()
            
            if response.status_code != 200:
                print(f"Groq API Error: {res_data}")
                return f"AI Provider Error ({response.status_code}): {res_data.get('error', {}).get('message', 'Unknown error')}"
                
            if 'choices' not in res_data or not res_data['choices']:
                print(f"Groq Unexpected Response: {res_data}")
                return "AI provider returned an empty or invalid response. Please try again."

            return res_data['choices'][0]['message']['content']
    except httpx.TimeoutException:
        print("Groq API Timeout")
        return "AI Analysis timed out. The model is currently busy. Please try again in a moment."
    except Exception as e:
        print(f"Groq Engine Error: {e}")
        import traceback
        traceback.print_exc()
        return f"Failed to generate AI recommendations: {str(e)}"
