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
        
        # 2. Distribute tags into categories and try to find a name
        distribution = {cat: 0 for cat in LAND_CATEGORIES}
        detected_name = None
        raw_types = []
        
        for element in elements:
            tags = element.get("tags", {})
            landuse = tags.get("landuse")
            natural = tags.get("natural")
            name = tags.get("name")
            
            if name and not detected_name:
                detected_name = name
            
            if landuse: raw_types.append(landuse)
            if natural: raw_types.append(natural)
            
            for cat, tag_list in LAND_CATEGORIES.items():
                if landuse in tag_list or natural in tag_list:
                    distribution[cat] += 1
            
        total = sum(distribution.values())
        if total == 0:
            distribution["open_land"] = 1.0
            dominant_type = "open_land"
            raw_type = "unclassified"
        else:
            distribution = {k: v/total for k, v in distribution.items()}
            dominant_type = max(distribution, key=distribution.get)
            # Find most frequent raw type
            raw_type = max(set(raw_types), key=raw_types.count) if raw_types else dominant_type
            
        return {
            "distribution": distribution,
            "dominant_type": dominant_type,
            "raw_type": raw_type,
            "detected_name": detected_name
        }
    except Exception as e:
        print(f"Error in land classification: {e}")
        return {
            "distribution": {"open_land": 1.0},
            "dominant_type": "open_land",
            "raw_type": "error",
            "detected_name": None
        }
