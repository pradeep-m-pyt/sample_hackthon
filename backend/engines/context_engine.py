import httpx
import os
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def fetch_surroundings(lat: float, lng: float) -> dict:
    query = f"""
    [out:json][timeout:25];
    (
      way["natural"="water"](around:2000, {lat}, {lng});
      way["waterway"="river"](around:2000, {lat}, {lng});
      way["waterway"="stream"](around:2000, {lat}, {lng});
      way["natural"="wetland"](around:2000, {lat}, {lng});
      way["landuse"="forest"](around:2000, {lat}, {lng});
      way["landuse"="farmland"](around:2000, {lat}, {lng});
      relation["boundary"="protected_area"](around:5000, {lat}, {lng});
      way["leisure"="nature_reserve"](around:5000, {lat}, {lng});
    );
    out center;
    """
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post("https://overpass-api.de/api/interpreter", data={"data": query})
            data = response.json()
            
        elements = data.get("elements", [])
        
        water_bodies = []
        wetlands = []
        forests = []
        farmlands = []
        protected_areas = []
        
        for el in elements:
            tags = el.get("tags", {})
            name = tags.get("name", "Unnamed")
            
            if tags.get("natural") == "water" or tags.get("waterway") in ["river", "stream"]:
                water_bodies.append(name)
            elif tags.get("natural") == "wetland":
                wetlands.append(name)
            elif tags.get("landuse") == "forest":
                forests.append(name)
            elif tags.get("landuse") == "farmland":
                farmlands.append(name)
            elif tags.get("boundary") == "protected_area" or tags.get("leisure") == "nature_reserve":
                protected_areas.append(name)
                
        return {
            "water_bodies": list(set(water_bodies)),
            "wetlands": list(set(wetlands)),
            "forests": list(set(forests)),
            "farmlands": list(set(farmlands)),
            "protected_areas": list(set(protected_areas)),
            "total_features": len(elements)
        }
    except Exception as e:
        print("Overpass context error:", e)
        return {"error": str(e)}

async def generate_pre_analysis(lat: float, lng: float, context: dict) -> str:
    if not GROQ_API_KEY:
        return "GROQ API KEY not configured. Unable to provide AI recommendations."
        
    water_str = ", ".join(context.get('water_bodies', [])) if context.get('water_bodies') else "None detected within 2km."
    wetlands_str = ", ".join(context.get('wetlands', [])) if context.get('wetlands') else "None detected within 2km."
    forests_str = ", ".join(context.get('forests', [])) if context.get('forests') else "None detected within 2km."
    farmlands_str = ", ".join(context.get('farmlands', [])) if context.get('farmlands') else "None detected within 2km."
    protected_str = ", ".join(context.get('protected_areas', [])) if context.get('protected_areas') else "None detected within 5km."

    prompt = f"""
    You are an AI Land Resource Advisor focused on ECO-FRIENDLY MONETIZATION and DEVELOPMENT.
    A user has outlined a specific plot of land at Latitude {lat}, Longitude {lng}.
    
    We queried the Overpass API for the surroundings of this plot and discovered the following live geodata:
    - Water Bodies (within 2km): {water_str}
    - Wetlands (within 2km): {wetlands_str}
    - Forests (within 2km): {forests_str}
    - Farmlands (within 2km): {farmlands_str}
    - Protected Areas (within 5km): {protected_str}
    
    Based ONLY on this live API context, recommend EXACTLY TWO highly profitable and eco-friendly constructions, businesses, or projects the user can physically BUILD ON THEIR SPECIFIC LAND PLOT.
    
    CRITICAL INSTRUCTION: Do NOT suggest saving the nearby lake, preserving external natural resources, or vague conservation. You must tell the user what they should BUILD or DO on their own land to make money while being environmentally conscious.
    
    Examples of good recommendations: 
    - "Because the Overpass API detected Adyar River nearby, there is high flood risk. I recommend building Flood-Resilient Raised Eco-Homes to monetize the land safely."
    - "Because the API detected Puzhal Lake, you have natural drainage. I recommend building a Commercial Fish Farm on your land for high ROI."
    - "Because there are no water bodies but high sun exposure, build a Solar Farming Facility on your land to generate energy revenue."
    - "Because there are nearby farmlands, build an Agroforestry and Beekeeping (Apiculture) business on this plot to monetize pollination."
    
    Format your response as a SHORT, punchy summary. 
    1. EXPLAIN why you are suggesting these two exact businesses, explicitly mentioning the API live data (e.g., "Because the API detected...").
    2. Recommend the two specific eco-businesses/developments.
    
    Keep it under 150 words. Do not use markdown headers, just plain text with emojis.
    """
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.6,
                    "max_tokens": 400
                }
            )
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            return "Could not generate recommendation from AI."
    except Exception as e:
        print("Groq AI Error:", e)
        return "AI analysis timeout or error."
