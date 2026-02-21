import httpx
from typing import List, Dict

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Maps OSM 'landuse' and 'natural' tag values -> our internal categories
OSM_TAG_MAP: Dict[str, str] = {
    # Forest / Vegetation
    "forest": "forest", "wood": "forest", "tree_row": "forest",
    "trees": "forest",
    # Wetland
    "wetland": "wetland", "marsh": "wetland", "swamp": "wetland",
    "bog": "wetland", "fen": "wetland",
    # Agriculture
    "farmland": "agriculture", "farmyard": "agriculture",
    "orchard": "agriculture", "vineyard": "agriculture",
    "meadow": "agriculture", "greenhouse_horticulture": "agriculture",
    "allotments": "agriculture",
    # Grassland - treat as open_land
    "grassland": "open_land", "heath": "open_land", "scrub": "open_land",
    "fell": "open_land", "bare_rock": "open_land", "sand": "open_land",
    "grass": "open_land",
    # Urban
    "residential": "urban", "commercial": "urban", "industrial": "urban",
    "retail": "urban", "construction": "urban", "landfill": "urban",
    "brownfield": "urban",
    # Water
    "water": "water", "river": "water", "stream": "water",
    "pond": "water", "basin": "water", "reservoir": "water",
    "bay": "water", "coastline": "water",
}

CATEGORIES = ["forest", "wetland", "agriculture", "urban", "water", "open_land"]

# Approximate area weight per element type (ways >> nodes)
ELEMENT_WEIGHTS = {"way": 10, "relation": 50, "node": 1}


async def classify_land(polygon: List[Dict[str, float]]) -> Dict:
    """
    Queries the Overpass API for all OSM landuse/natural features
    within the polygon bounding box and converts them into a
    weighted distribution across our six land categories.
    Uses element-type weighting (relation > way > node) to better
    approximate actual spatial coverage.
    """
    lats = [p["lat"] for p in polygon]
    lngs = [p["lng"] for p in polygon]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    query = f"""
    [out:json][timeout:30];
    (
      way["landuse"]({min_lat},{min_lng},{max_lat},{max_lng});
      relation["landuse"]({min_lat},{min_lng},{max_lat},{max_lng});
      way["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
      relation["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
      node["natural"]({min_lat},{min_lng},{max_lat},{max_lng});
    );
    out tags;
    """

    distribution = {cat: 0.0 for cat in CATEGORIES}

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(OVERPASS_URL, data={"data": query})
            data = response.json()

        elements = data.get("elements", [])

        for element in elements:
            tags = element.get("tags", {})
            landuse = tags.get("landuse", "")
            natural = tags.get("natural", "")
            element_type = element.get("type", "node")
            weight = ELEMENT_WEIGHTS.get(element_type, 1)

            # Prefer landuse over natural for categorisation
            raw_tag = landuse or natural
            category = OSM_TAG_MAP.get(raw_tag)
            if category:
                distribution[category] += weight

        total = sum(distribution.values())
        if total == 0:
            # No OSM data found – reasonable default for undeveloped land
            distribution = {
                "open_land": 0.5, "agriculture": 0.3, "forest": 0.1,
                "wetland": 0.0, "urban": 0.1, "water": 0.0
            }
        else:
            distribution = {k: round(v / total, 4) for k, v in distribution.items()}

        dominant_type = max(distribution, key=distribution.get)

        return {
            "distribution": distribution,
            "dominant_type": dominant_type,
            "osm_feature_count": len(elements),
        }

    except Exception as e:
        print(f"Land classification error: {e}")
        return {
            "distribution": {
                "open_land": 0.5, "agriculture": 0.3, "forest": 0.1,
                "wetland": 0.0, "urban": 0.1, "water": 0.0
            },
            "dominant_type": "open_land",
            "osm_feature_count": 0,
        }
