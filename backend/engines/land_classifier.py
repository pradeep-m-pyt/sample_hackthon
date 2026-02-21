import httpx
import json
from typing import List, Dict

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Categories and their OSM tags mapping
LAND_CATEGORIES = {
    "forest": ["forest", "wood", "tree_row"],
    "wetland": ["wetland", "marsh", "swamp"],
    "agriculture": ["farmland", "farmyard", "orchard", "vineyard", "meadow", "grassland"],
    "urban": ["residential", "commercial", "industrial", "retail", "construction"],
    "water": ["water", "river", "steam", "pond", "basin"],
    "open_land": ["scrub", "heath", "bare_rock", "sand", "grass"]
}

async def classify_land(polygon: List[Dict[str, float]]) -> Dict:
    """
    Accepts a list of {lat, lng} dicts representing a polygon.
    Queries Overpass API for features within that bounding box.
    """
    # 1. Calculate BBox for query
    lats = [p['lat'] for p in polygon]
    lngs = [p['lng'] for p in polygon]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    
    # Simple Overpass query for landuse and natural tags in the bbox
    # In a more advanced version, we would clip features to the polygon
    query = f"""
    [out:json][timeout:25];
    (
      way["landuse"]({min_lat},{min_lng},{max_lat},{max_lng});
      node["landuse"]({min_lat},{min_lng},{max_lat},{max_lng});
      relation["landuse"]({min_lat},{min_lng},{max_lat},{max_lng});
      way["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
      node["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
      relation["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
    );
    out tags;
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(OVERPASS_URL, data={'data': query})
            data = response.json()
            
        elements = data.get("elements", [])
        
        # 2. Distribute tags into categories
        distribution = {cat: 0 for cat in LAND_CATEGORIES}
        
        for element in elements:
            tags = element.get("tags", {})
            landuse = tags.get("landuse")
            natural = tags.get("natural")
            
            applied = False
            for cat, tag_list in LAND_CATEGORIES.items():
                if landuse in tag_list or natural in tag_list:
                    distribution[cat] += 1
                    applied = True
            
        # 3. Simple heuristic: if nothing found, default to open_land (or based on general location)
        total = sum(distribution.values())
        if total == 0:
            distribution["open_land"] = 1.0
        else:
            # Convert to percentages
            distribution = {k: v/total for k, v in distribution.items()}
            
        dominant_type = max(distribution, key=distribution.get)
        
        return {
            "distribution": distribution,
            "dominant_type": dominant_type
        }
    except Exception as e:
        print(f"Error in land classification: {e}")
        return {
            "distribution": {"open_land": 1.0},
            "dominant_type": "open_land"
        }
