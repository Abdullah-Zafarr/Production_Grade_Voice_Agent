"""
client.py — Cal.com API V2 Client.
Handles slot availability checks and booking creation.
"""
import logging
import httpx
import zoneinfo
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional
from agent.config import settings

logger = logging.getLogger("calcom-client")

CALCOM_BASE_URL = "https://api.cal.com/v2"

def _format_display_time(dt_utc: datetime, tz: zoneinfo.ZoneInfo) -> str:
    """
    Format a UTC datetime into a human-readable string in the clinic's
    LOCAL timezone. e.g. "Monday, May 12 at 10:30 AM"
    """
    local_dt = dt_utc.astimezone(tz)
    # Use %I and strip leading zero — works cross-platform (Windows + Linux)
    hour_str = local_dt.strftime("%I").lstrip("0") or "12"
    return local_dt.strftime(f"%A, %B %d at {hour_str}:%M %p")


# ─── Client ────────────────────────────────────────────────────────────────

class CalComClient:
    """Client for interacting with the Cal.com API V2."""
    
    def __init__(self):
        self.api_key = settings.CALCOM_API_KEY
        self.event_type_id = settings.CALCOM_EVENT_TYPE_ID
        self.timezone_str = settings.TIMEZONE
        try:
            self.tz = zoneinfo.ZoneInfo(self.timezone_str)
        except Exception:
            logger.warning(
                f"Unknown timezone '{self.timezone_str}', falling back to UTC."
            )
            self.tz = zoneinfo.ZoneInfo("UTC")

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "cal-api-version": "2024-08-13",
            "Content-Type": "application/json",
        }

    async def get_available_slots(
        self, start_date: str, end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch available slots for the configured event type directly from Cal.com.
        start_date / end_date must be 'YYYY-MM-DD'.
        """
        if not end_date:
            start_dt = date.fromisoformat(start_date)
            end_date = (start_dt + timedelta(days=7)).isoformat()

        url = f"{CALCOM_BASE_URL}/slots/available"
        params = {
            "eventTypeId": self.event_type_id,
            "startTime": f"{start_date}T00:00:00.000Z",
            "endTime": f"{end_date}T23:59:59.999Z",
            "timeZone": self.timezone_str,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                data = response.json()

                slots_by_day: Dict[str, List] = (
                    data.get("data", {}).get("slots", {})
                )

                formatted_slots: List[Dict[str, Any]] = []

                for day_slots in slots_by_day.values():
                    for slot in day_slots:
                        time_str = (
                            slot.get("time", "") if isinstance(slot, dict) else slot
                        )
                        if not time_str:
                            continue

                        dt_utc = datetime.fromisoformat(
                            time_str.replace("Z", "+00:00")
                        )

                        local_dt = dt_utc.astimezone(self.tz)
                        local_date = local_dt.strftime("%Y-%m-%d")
                        
                        # 9 AM - 5 PM Filter (Clinic Hours)
                        if local_dt.hour < 9 or local_dt.hour >= 17:
                            continue

                        display = _format_display_time(dt_utc, self.tz)
                        formatted_slots.append(
                            {
                                "time": time_str,
                                "display_time": display,
                                "date": local_date,
                            }
                        )

                # Sort chronologically
                formatted_slots.sort(key=lambda s: s["time"])

                logger.info(f"Successfully fetched {len(formatted_slots)} slots from Cal.com.")
                return formatted_slots

            except httpx.HTTPStatusError as e:
                logger.error(f"Cal.com slots HTTP error: {e.response.status_code}")
                return []
            except Exception as e:
                logger.error(f"Unexpected error fetching Cal.com slots: {e}")
                return []

    async def create_booking(
        self,
        start_time: str,
        name: str,
        email: str,
        phone: str,
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Create a confirmed booking via the Cal.com API.
        """
        url = f"{CALCOM_BASE_URL}/bookings"
        payload = {
            "start": start_time,
            "eventTypeId": int(self.event_type_id),
            "attendee": {
                "name": name,
                "email": email,
                "timeZone": self.timezone_str,
                "language": "en",
            },
            "metadata": {
                "bookedBy": "SarahVoiceAgent",
                "phone": phone,
                "notes": notes,
            },
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                logger.info(f"Successfully created booking for {name} at {start_time}")
                return {"status": "success", "data": response.json()}
            except httpx.HTTPStatusError as e:
                logger.error(f"Cal.com booking HTTP error: {e.response.status_code}")
                return {"status": "error", "message": e.response.text}
            except Exception as e:
                logger.error(f"Unexpected error creating Cal.com booking: {e}")
                return {"status": "error", "message": str(e)}


# Module-level singleton
calcom_client = CalComClient()
