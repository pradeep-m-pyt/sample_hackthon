from typing import Dict

# Carbon stock by land type (tons C per hectare) - IPCC Defaults
CARBON_STOCKS_TC_HA = {
    "forest": 120.0,
    "wetland": 200.0, 
    "agriculture": 15.0,
    "urban": 5.0,
    "open_land": 20.0,
    "water": 2.0
}

# Annual sequestration flux (tons C per hectare per year)
CARBON_FLUX_TC_HA_YR = {
    "forest": 5.0,
    "wetland": 2.5,
    "agriculture": 0.3,
    "urban": 0.1,
    "open_land": 0.5,
    "water": 0.1
}

# Social Cost of Carbon (SCC) per ton CO2 (EPA 2023 - $51 USD)
# 1 ton Carbon = 3.67 tons CO2
SCC_INR_TON_CO2 = 51.0 * 83.0 # ₹4,233

async def run_carbon_analysis(area_m2: float, distribution: Dict[str, float]) -> Dict:
    area_ha = area_m2 / 10000.0
    
    total_stored_c = 0
    total_annual_flux_c = 0
    
    for cat, weight in distribution.items():
        cat_area_ha = area_ha * weight
        total_stored_c += cat_area_ha * CARBON_STOCKS_TC_HA.get(cat, 10)
        total_annual_flux_c += cat_area_ha * CARBON_FLUX_TC_HA_YR.get(cat, 0.2)
        
    total_stored_co2 = total_stored_c * 3.67
    total_annual_co2 = total_annual_flux_c * 3.67
    
    annual_value_inr = total_annual_co2 * SCC_INR_TON_CO2
    stored_value_inr = total_stored_co2 * SCC_INR_TON_CO2
    
    return {
        "stored_carbon_tons": round(total_stored_c, 2),
        "stored_co2_tons": round(total_stored_co2, 2),
        "annual_sequestration_co2_tons": round(total_annual_co2, 2),
        "annual_carbon_value_inr": round(annual_value_inr, 2),
        "stored_carbon_value_inr": round(stored_value_inr, 2)
    }
