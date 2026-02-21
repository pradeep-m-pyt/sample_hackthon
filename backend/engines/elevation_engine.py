import httpx
import os
import math
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
OT_API_KEY = os.getenv("OPENTOPOGRAPHY_API_KEY")

async def get_elevation_for_points(points: List[Dict[str, float]]) -> List[float]:
    """
    Fetches elevation (meters) for a list of {lat, lng} points
    using the free Open-Elevation API (no key required).
    Falls back to defaults if the service is unavailable.
    """
    locations_str = "|".join(f"{p['lat']},{p['lng']}" for p in points)
    url = f"{OPEN_ELEVATION_URL}?locations={locations_str}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url)
            data = res.json()
            return [r["elevation"] for r in data.get("results", [])]
    except Exception as e:
        print(f"Open-Elevation API error: {e}")
        return [25.0] * len(points)


def compute_slope_pct(elevations: List[float], lats: List[float], lngs: List[float]) -> float:
    """
    Compute approximate mean slope (%) across the polygon by comparing
    elevation differences between polygon corner points.
    """
    if len(elevations) < 2:
        return 1.5

    METERS_PER_DEG_LAT = 111_320.0
    slopes = []
    for i in range(len(elevations) - 1):
        delta_elev = abs(elevations[i + 1] - elevations[i])
        dlat = (lats[i + 1] - lats[i]) * METERS_PER_DEG_LAT
        dlng = (lngs[i + 1] - lngs[i]) * METERS_PER_DEG_LAT * math.cos(math.radians(lats[i]))
        horiz_dist = math.sqrt(dlat**2 + dlng**2)
        if horiz_dist > 1:  # Avoid divide-by-zero on same points
            slopes.append((delta_elev / horiz_dist) * 100)

    return round(sum(slopes) / len(slopes), 2) if slopes else 1.5


async def get_elevation_data(polygon: List[Dict[str, float]]) -> Dict:
    """
    Main entry point: fetches elevation for all polygon vertices,
    computes mean elevation and slope, and returns terrain metadata.
    """
    # Use up to 10 sample points to keep API request small
    sampled = polygon[::max(1, len(polygon) // 10)][:10]
    lats = [p["lat"] for p in sampled]
    lngs = [p["lng"] for p in sampled]

    elevations = await get_elevation_for_points(sampled)

    mean_elev = round(sum(elevations) / len(elevations), 2)
    slope_pct = compute_slope_pct(elevations, lats, lngs)

    if slope_pct < 2:
        terrain_type = "Flat"
    elif slope_pct < 8:
        terrain_type = "Gentle Slope"
    elif slope_pct < 20:
        terrain_type = "Hilly"
    else:
        terrain_type = "Mountainous"

    return {
        "mean_elevation": mean_elev,
        "slope_pct": slope_pct,
        "terrain_type": terrain_type,
        "sample_points": len(sampled),
        "min_elevation": round(min(elevations), 2),
        "max_elevation": round(max(elevations), 2),
    }
