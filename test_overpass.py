import httpx
import asyncio

async def test():
    query = """
    [out:json][timeout:25];
    (
      way["natural"="water"](around:2000, 13.13207, 80.1717346);
      way["waterway"="river"](around:2000, 13.13207, 80.1717346);
      way["waterway"="stream"](around:2000, 13.13207, 80.1717346);
      way["natural"="wetland"](around:2000, 13.13207, 80.1717346);
      way["landuse"="forest"](around:2000, 13.13207, 80.1717346);
      way["landuse"="farmland"](around:2000, 13.13207, 80.1717346);
      relation["boundary"="protected_area"](around:5000, 13.13207, 80.1717346);
      way["leisure"="nature_reserve"](around:5000, 13.13207, 80.1717346);
    );
    out geom;
    """
    async with httpx.AsyncClient() as client:
        response = await client.post("https://overpass-api.de/api/interpreter", data={"data": query})
        try:
            print(len(response.json()["elements"]))
        except Exception as e:
            print(response.text)
            print(e)
            
asyncio.run(test())
