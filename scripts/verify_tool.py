import asyncio
import os
import sys
from agent.tools.calendar_tool import create_check_availability_tool

async def main():
    try:
        check_availability = create_check_availability_tool()
        # Today is Sunday, so it should find Monday, Tuesday etc.
        result = await check_availability()
        print("TOOL OUTPUT:")
        print("-" * 40)
        print(result)
        print("-" * 40)
        
        # Verify it mentions Tuesday
        if "2026-04-21" in result or "Tuesday" in result:
             print("SUCCESS: Tuesday is now visible in the report!")
        else:
             print("FAILURE: Tuesday is missing from the report.")
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(main())
