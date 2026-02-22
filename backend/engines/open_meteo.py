import httpx

async def get_rainfall_trend(lat: float, lon: float) -> str:
    """
    Fetches 30 years of monthly rainfall data from OpenMeteo
    and calculates whether the long-term trend is increasing, decreasing, or stable.
    """
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date=1990-01-01&end_date=2024-01-01&monthly=precipitation_sum"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                precip = data.get("monthly", {}).get("precipitation_sum", [])
                
                # Filter out None values which might occur for recent incomplete months
                valid_precip = [p for p in precip if p is not None]
                if len(valid_precip) > 120:  # Need at least 10 years of valid data
                    mid = len(valid_precip) // 2
                    first_half = sum(valid_precip[:mid])
                    second_half = sum(valid_precip[mid:])
                    
                    if second_half < first_half * 0.95:
                        return "declining"
                    elif second_half > first_half * 1.05:
                        return "increasing"
                    else:
                        return "stable"
    except Exception as e:
        print(f"OpenMeteo fetch failed: {e}")
    
    # If API fails or data is insufficient, assume worst-case climate scenario trend
    return "declining"
