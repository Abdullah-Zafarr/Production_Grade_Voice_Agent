import asyncio
import os
import sys
from agent.api_routes.webhooks import process_recording_conversion
from agent.config import settings

async def main():
    if len(sys.argv) < 2:
        print("Usage: python trigger_conversion.py <room_name_or_call_id>")
        return
    
    identifier = sys.argv[1]
    
    # Smart detection of file extension in bucket
    raw_path = None
    possible_extensions = [".webm", ".ogg", ".mp4"]
    
    print(f"Searching for recording artifacts for: {identifier}")
    
    # We could list the bucket here, but for simplicity let's try to find it via the identifier
    # The process_recording_conversion function in webhooks.py already tries to handle the path.
    # However, we need to pass the CORRECT raw_path to it.
    
    # For now, let's just try .ogg first since we saw it in the bucket
    raw_path = f"{identifier}.ogg" 
    
    print(f"Manually triggering conversion for: {identifier}")
    print(f"Assuming raw file: {raw_path}")
    
    try:
        # process_recording_conversion(call_id_or_room, raw_path, duration_fallback)
        # It handles both call_id and room_name in the DB lookup
        await process_recording_conversion(identifier, raw_path, 0)
        print("Conversion process finished. Check logs for details.")
    except Exception as e:
        print(f"Error during manual trigger: {e}")

if __name__ == "__main__":
    # Add current dir to path to find agent module
    sys.path.append(os.getcwd())
    asyncio.run(main())
