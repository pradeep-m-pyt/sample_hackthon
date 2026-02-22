import httpx
from typing import Dict

# ── SCS Curve Number Table (NRCS TR-55, AMC-II condition) ──────────────────
# Categories: forest, wetland, agriculture, urban, open_land, water
CN_TABLE: Dict[str, float] = {
    "forest":      55.0,   # Good forest cover, high infiltration
    "wetland":     78.0,   # Permanently saturated – high CN
    "agriculture": 75.0,   # Cultivated land with contour
    "urban":       92.0,   # Residential / commercial impervious
    "open_land":   68.0,   # Pasture / scrub – fair condition
    "water":       98.0,   # Direct runoff
}

# Municipal stormwater treatment / flood damage cost (₹ per m³)
# Based on NMCG & CPHEEO benchmarks for Indian urban areas
STORMWATER_COST_INR_M3 = 55.0

# Annual rainfall API (NASA POWER)
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"


async def get_annual_rainfall_mm(lat: float, lng: float) -> float:
    """
    Fetches the corrected precipitation total for the most recent
    complete year (2023) from NASA POWER (PRECTOTCORR = mm/month).
    Returns annual sum in mm; uses 1 200 mm as a safe fallback.
    """
    params = {
        "parameters": "PRECTOTCORR",
        "community": "AG",
        "longitude": str(lng),
        "latitude": str(lat),
        "format": "JSON",
        "start": "2023",
        "end": "2023",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(NASA_POWER_URL, params=params)
            data = res.json()
        monthly = data["properties"]["parameter"]["PRECTOTCORR"]
        
        # NASA monthly PRECTOTCORR is mm/day for each month.
        # We need to multiply by days in each month to get annual sum.
        # Keys are "202301", "202302", etc. "202313" is the annual average.
        days_in_months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        annual_sum = 0.0
        for i in range(1, 13):
            key = f"2023{i:02d}"
            if key in monthly:
                annual_sum += monthly[key] * days_in_months[i-1]
        
        if annual_sum > 0:
            return round(annual_sum, 2)
            
        # Fallback to annual avg if monthly loop failed
        if "202313" in monthly:
            return round(monthly["202313"] * 365.25, 2)
            
        return 1200.0
    except Exception as e:
        print(f"NASA POWER rainfall error: {e}")
        return 1200.0


def scs_runoff_mm(P_mm: float, CN: float) -> float:
    """
    Computes surface runoff depth (mm) from rainfall P (mm) and
    Curve Number via the standard SCS TR-55 formula.
    """
    if CN <= 0 or CN >= 100:
        return 0.0
    S = (25_400 / CN) - 254          # Potential maximum retention (mm)
    Ia = 0.2 * S                      # Initial abstraction
    if P_mm <= Ia:
        return 0.0
    Q = ((P_mm - Ia) ** 2) / (P_mm + 0.8 * S)
    return round(Q, 2)


async def run_flood_analysis(
    lat: float,
    lng: float,
    distribution: Dict[str, float],
    elevation: float,
    slope: float,
) -> Dict:
    """
    Full flood-risk analysis for a land parcel:
      1. Fetch real annual rainfall from NASA POWER
      2. Compute weighted Curve Number for current land cover
      3. Compute surface-runoff depth for current vs. full-development scenario
      4. Monetise avoided flood damage in ₹
      5. Return a composite risk score (0–1)
    """
    annual_p = await get_annual_rainfall_mm(lat, lng)

    # 1. Weighted Curve Number (current land cover)
    cn_current = sum(
        distribution.get(cat, 0.0) * CN_TABLE.get(cat, 70.0)
        for cat in CN_TABLE
    )

    # 2. Full urban-development scenario (CN → 92)
    cn_developed = 92.0

    # 3. Runoff depths
    runoff_current_mm  = scs_runoff_mm(annual_p, cn_current)
    runoff_developed_mm = scs_runoff_mm(annual_p, cn_developed)
    delta_runoff_mm    = max(0.0, runoff_developed_mm - runoff_current_mm)

    # 4. Monetise — per hectare:
    # 1 mm runoff × 1 ha = 10 m³
    # We report a per-m² basis so the aggregator can scale by area
    annual_damage_avoided_inr_per_m2 = (delta_runoff_mm / 1000.0) * STORMWATER_COST_INR_M3

    # 5. Composite risk score (0–1)
    # Low elevation → higher risk; high rainfall → higher risk; steep slope → flash-flood risk
    elev_factor  = max(0.0, min(1.0, (20.0 - elevation) / 20.0))   # 0 m elev = 1.0 risk
    rain_factor  = max(0.0, min(1.0, annual_p / 3000.0))            # 3 000 mm = 1.0 risk
    slope_factor = max(0.0, min(1.0, slope / 30.0))                 # 30 % slope = 1.0

    risk_score = round(
        0.45 * elev_factor + 0.35 * rain_factor + 0.20 * slope_factor, 4
    )

    # GeoPandas NDMA Check (fallback to probabilistic score if shapefile missing)
    risk_label = "Moderate"
    try:
        import geopandas as gpd
        from shapely.geometry import Point
        import os
        shp_path = os.path.join(os.path.dirname(__file__), "ndma_flood_zones.shp")
        
        if os.path.exists(shp_path):
            flood_zones = gpd.read_file(shp_path)
            user_point = Point(lng, lat)
            match = flood_zones[flood_zones.geometry.contains(user_point)]
            
            if match.empty:
                risk_label = "Low"
            else:
                risk_label = str(match.iloc[0].get("ZONE_LEVEL", "High"))
        else:
            if risk_score > 0.7:
                risk_label = "High"
            elif risk_score > 0.35:
                risk_label = "Moderate"
            else:
                risk_label = "Low"
    except Exception as e:
        print(f"GeoPandas execution failed: {e}")
        if risk_score > 0.7:
            risk_label = "High"
        elif risk_score > 0.35:
            risk_label = "Moderate"
        else:
            risk_label = "Low"

    return {
        "annual_rainfall_mm":              annual_p,
        "cn_current":                      round(cn_current, 2),
        "cn_developed":                    cn_developed,
        "runoff_current_mm":               runoff_current_mm,
        "runoff_developed_mm":             runoff_developed_mm,
        "delta_runoff_mm":                 delta_runoff_mm,
        "annual_damage_avoided_inr_per_m2": round(annual_damage_avoided_inr_per_m2, 4),
        "flood_risk_score":                min(1.0, risk_score),
        "risk_label":                      risk_label,
    }
