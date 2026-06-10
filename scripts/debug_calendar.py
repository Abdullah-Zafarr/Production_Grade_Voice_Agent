import asyncio
import os
import sys
from agent.calendar_integration.client import CalComClient
from datetime import date, timedelta

async def main():
    try:
        cal = CalComClient()
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=14)).isoformat()
        print(f"DEBUG: Fetching slots from {start} to {end}...")
        slots = await cal.get_available_slots(start, end)
        
        if not slots:
            print("DEBUG: No slots found at all.")
            return

        days_with_slots = {}
        for s in slots:
            d = s['date']
            days_with_slots[d] = days_with_slots.get(d, 0) + 1
        
        print(f"DEBUG: Found {len(slots)} total slots.")
        for d, count in sorted(days_with_slots.items()):
            print(f" - {d}: {count} slots")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(main())
