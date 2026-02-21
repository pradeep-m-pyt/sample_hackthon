import httpx
from typing import Dict, List

# Curve Number mapping for different land classes (AMC II)
# Categories: forest, wetland, agriculture, urban, open_land, water
CN_TABLE = {
    "forest": 55,       # Woods - good cover
    "wetland": 80,      # High retention but high runoff when full
    "agriculture": 75,  # Cultivated land
    "urban": 92,        # Residential 1/4 acre or less
    "open_land": 68,     # Pasture/Scrub - fair condition
    "water": 98         # Direct runoff (open water)
}

async def get_annual_rainfall(lat: float, lng: float) -> float:
    """Fetches annual rainfall from NASA POWER API (PRECTOTCORR)"""
    url = f"https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR&community=AG&longitude={lng}&latitude={lat}&format=JSON&start=2023&end=2023"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            data = res.json()
            # Sum monthly totals
            precip = data['properties']['parameter']['PRECTOTCORR']
            annual_sum = sum(precip.values())
            return annual_sum
    except Exception as e:
        print(f"NASA Rainfall API error: {e}")
        return 1200.0 # Default fallback

def calculate_runoff(P: float, CN: float) -> float:
    """Standard SCS Curve Number runoff equation (Q in mm)"""
    if P <= 0.2 * ((25400/CN) - 254):
        return 0
    S = (25400/CN) - 254
    Ia = 0.2 * S
    Q = ((P - Ia)**2) / (P + 0.8 * S)
    return Q

async def run_flood_analysis(
    lat: float, 
    lng: float, 
    distribution: Dict[str, float],
    elevation: float,
    slope: float
) -> Dict:
    annual_p = await get_annual_rainfall(lat, lng)
    
    # 1. Weighted Curve Number for current land
    weighted_cn_current = sum(distribution[cat] * CN_TABLE.get(cat, 70) for cat in distribution)
    
    # 2. Assume development increases CN (typical urban CN is ~90-95)
    # We'll assume a "standard" development scenario targets a CN of 92
    cn_developed = 92.0
    
    # 3. Calculate Runoff
    runoff_current = calculate_runoff(annual_p, weighted_cn_current)
    runoff_developed = calculate_runoff(annual_p, cn_developed)
    
    delta_runoff_mm = max(0, runoff_developed - runoff_current)
    
    # 4. Economic Value
    # Heuristic: ₹50 per cubic meter of avoided flood damage (based on municipal benchmarks)
    # 1mm runoff over 1 hectare = 10 m³
    # We'll calculate this in the aggregator.
    
    # 5. Flood Risk Score (0-1)
    # Combined factor of rainfall, elevation (low is risky), and slope (steep is risky for flash floods)
    # Normalize elevation: < 5m is high risk
    elev_factor = max(0, min(1, (15 - elevation) / 15))
    rain_factor = max(0, min(1, annual_p / 2500))
    
    risk_score = (0.4 * elev_factor) + (0.4 * rain_factor) + (0.2 * (slope/20))
    
    return {
        "annual_rainfall_mm": annual_p,
        "cn_current": weighted_cn_current,
        "runoff_current_mm": runoff_current,
        "delta_runoff_mm": delta_runoff_mm,
        "flood_risk_score": min(1.0, risk_score),
        "risk_label": "High" if risk_score > 0.7 else "Moderate" if risk_score > 0.3 else "Low"
    }
