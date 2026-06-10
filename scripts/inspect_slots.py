import asyncio
import os
import sys
from agent.calendar_integration.client import CalComClient
from datetime import date, timedelta

async def main():
    try:
        cal = CalComClient()
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=7)).isoformat()
        slots = await cal.get_available_slots(start, end)
        
        days_with_slots = {}
        for s in slots:
            d = s['date']
            if d not in days_with_slots:
                days_with_slots[d] = []
            days_with_slots[d].append(s['display_time'])
        
        for d in sorted(days_with_slots.keys()):
            print(f"{d}:")
            for t in days_with_slots[d]:
                print(f"  - {t}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(main())
