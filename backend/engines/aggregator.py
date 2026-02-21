from typing import Dict
import math

def calculate_npv(annual_value: float, years: int, discount_rate: float = 0.08) -> float:
    npv = 0
    for t in range(1, years + 1):
        npv += annual_value / ((1 + discount_rate) ** t)
    return npv

async def aggregate_analysis(
    area_m2: float,
    flood_data: Dict,
    solar_data: Dict,
    carbon_data: Dict,
    user_intent: str
) -> Dict:
    # 1. Calculate Individual NPVs (30 Years)
    years = 30
    discount_rate = 0.08
    
    # Flood Avoided Value: ₹50 / m3 avoided runoff
    # 1mm runoff on 1 hectare = 10 m3
    area_ha = area_m2 / 10000.0
    annual_flood_m3 = (flood_data["delta_runoff_mm"] / 1000.0) * area_m2
    annual_flood_value_inr = annual_flood_m3 * 50.0 # ₹50 per m3 damage cost
    
    flood_npv = calculate_npv(annual_flood_value_inr, years, discount_rate)
    solar_npv = calculate_npv(solar_data["annual_revenue_inr"], 20, discount_rate) # Solar usually 20yr life
    carbon_npv = calculate_npv(carbon_data["annual_carbon_value_inr"], years, discount_rate) + carbon_data["stored_carbon_value_inr"]
    
    total_environmental_npv = flood_npv + solar_npv + carbon_npv
    
    # 2. Financial Perspective (Development Baseline)
    # Estimate land value increase or sale price if developed
    # Chennai/Urban average: ₹5,000 per sqft
    sqft = area_m2 * 10.764
    if user_intent in ["housing", "industry"]:
        financial_return = sqft * 3000.0 # Profit margin per sqft
    else:
        financial_return = sqft * 1000.0 # Basic land appreciation
        
    # 3. Composite Decision Score (0-100)
    # Weighted balance of Eco Value, Profit Potential, and Risk
    flood_risk = flood_data["flood_risk_score"]
    
    eco_weight = 0.4
    fin_weight = 0.4
    risk_weight = 0.2
    
    score = (
        eco_weight * (min(1, total_environmental_npv / 10000000) * 100) +
        fin_weight * (min(1, financial_return / 50000000) * 100) +
        risk_weight * (1 - flood_risk) * 100
    )
    
    return {
        "environmental_npv": round(total_environmental_npv, 2),
        "financial_npv": round(financial_return, 2),
        "composite_score": round(score, 1),
        "metrics": {
            "flood_avoided_npv": round(flood_npv, 2),
            "solar_roi_npv": round(solar_npv, 2),
            "carbon_npv": round(carbon_npv, 2),
        },
        "indicators": {
            "is_eco_dominant": total_environmental_npv > financial_return * 0.5,
            "is_high_risk": flood_risk > 0.7
        }
    }
