import asyncio
import inspect
from livekit.api import LiveKitAPI

async def main():
    lk = LiveKitAPI("http://x", "x", "x")
    sig = inspect.signature(lk.egress.start_room_composite_egress)
    print(sig)
    await lk.aclose()

asyncio.run(main())
