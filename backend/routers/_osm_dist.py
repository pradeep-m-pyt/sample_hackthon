import httpx

async def get_land_cover_from_osm(lat: float, lon: float):
    query = f"""
    [out:json];
    (
      way["landuse"](around:200, {lat}, {lon});
      way["natural"](around:200, {lat}, {lon});
      way["water"](around:200, {lat}, {lon});
    );
    out tags;
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post("https://overpass-api.de/api/interpreter", data={"data": query})
            return res.json().get("elements", [])
    except Exception as e:
        print("OSM Land Cover Error:", e)
        return []

OSM_TO_DISTRIBUTION = {
    # landuse
    "forest":        "forest",
    "orchard":       "forest",
    "wood":          "forest",
    "farmland":      "agriculture",
    "farmyard":      "agriculture",
    "meadow":        "agriculture",
    "residential":   "urban",
    "commercial":    "urban",
    "industrial":    "urban",
    "construction":  "urban",
    "wetland":       "wetland",
    "basin":         "wetland",
    "grass":         "open_land",
    "scrub":         "open_land",
    "heath":         "open_land",
    # natural
    "water":         "water",
    "wetland":       "wetland",
    "wood":          "forest",
    "scrub":         "open_land",
    "grassland":     "open_land",
}

USER_INPUT_MAP = {
    "Farmland":              {"agriculture": 0.8, "open_land": 0.2},
    "Wetland":               {"wetland": 0.7, "water": 0.2, "open_land": 0.1},
    "Degraded / Barren Land":{"open_land": 0.6, "agriculture": 0.2, "urban": 0.2},
    "Forest / Green Cover":  {"forest": 0.8, "open_land": 0.15, "water": 0.05},
    "Empty Urban Plot":      {"urban": 0.5, "open_land": 0.3, "agriculture": 0.2},
    "Residential Plot":      {"urban": 0.6, "open_land": 0.3, "forest": 0.1},
    "Coastal Land":          {"wetland": 0.4, "water": 0.3, "open_land": 0.3},
}

async def build_distribution(lat: float, lon: float, user_selected_land_type: str):
    osm_features = await get_land_cover_from_osm(lat, lon)
    
    if osm_features:
        counts = {}
        for feature in osm_features:
            tags = feature.get("tags", {})
            tag_val = tags.get("landuse") or tags.get("natural") or tags.get("water")
            engine_key = OSM_TO_DISTRIBUTION.get(tag_val)
            if engine_key:
                counts[engine_key] = counts.get(engine_key, 0) + 1
                
        total = sum(counts.values())
        if total > 0:
            return {k: v / total for k, v in counts.items()}
            
    # Fallback
    return USER_INPUT_MAP.get(user_selected_land_type) or {"open_land": 0.5, "agriculture": 0.5}

