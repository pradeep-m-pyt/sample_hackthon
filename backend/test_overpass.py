
import asyncio
import httpx

async def test_overpass():
    url = "https://overpass-api.de/api/interpreter"
    query = '[out:json][timeout:30];node(51.5, -0.1, 51.51, -0.09);out;'
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data={"data": query})
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("Overpass API is Working!")
                print(f"Elements found: {len(response.json().get('elements', []))}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_overpass())
