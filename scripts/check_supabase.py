import asyncio
import httpx
import os
import sys
from agent.config import settings

async def main():
    url = f"{settings.SUPABASE_URL}/rest/v1/call_logs"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    params = {"select": "count", "head": "true"}
    
    async with httpx.AsyncClient() as client:
        try:
            # We use head=true and select=count to get the total count in the Content-Range header
            response = await client.get(url, headers=headers, params={"select": "*", "limit": "1"})
            response.raise_for_status()
            
            # Show the count from the response headers or just the length of a full query
            full_res = await client.get(url, headers=headers, params={"select": "call_id"})
            print(f"Total call_logs in database: {len(full_res.json())}")
            
            # Print last 5 call IDs and timestamps
            last_5 = await client.get(url, headers=headers, params={"select": "call_id,started_at", "order": "started_at.desc", "limit": "5"})
            print("\nLast 5 calls:")
            for c in last_5.json():
                print(f" - {c.get('started_at')}: {c.get('call_id')}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(main())
