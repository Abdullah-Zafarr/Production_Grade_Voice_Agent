"""
calendar_tool.py - State-safe tools for appointment scheduling.

Fix: The agent now offers only 2–3 pre-filtered, timezone-correct slots
(matching the booking.orchestrator.ts logic). Previously, all raw Cal.com
slots were dumped to the agent which caused it to propose random/invalid times.
"""
from typing import Annotated, Optional, Callable, Any
import datetime
import logging
from livekit.agents import function_tool
from agent.calendar_integration.client import calcom_client, _format_display_time

logger = logging.getLogger("calendar-tool")

# Removed MAX_OFFERED_SLOTS limit as per user request to provide full visibility


def create_check_availability_tool() -> Callable[..., Any]:
    """Factory for the availability checking tool."""
    @function_tool(
        name="check_availability",
        description="Check available appointment slots at the clinic for a specific date range.",
    )
    async def check_availability(
        date_from: Annotated[Optional[str], "Start date (YYYY-MM-DD). Defaults to today."] = None,
        date_to: Annotated[Optional[str], "End date (YYYY-MM-DD). Defaults to 7 days ahead."] = None,
    ) -> str:
        """Queries Cal.com for available slots and formats a readable report for the LLM."""
        if not date_from:
            date_from = datetime.date.today().isoformat()
        else:
            # Handle cases where LLM passes a full ISO string instead of just the date
            if "T" in date_from:
                date_from = date_from.split("T")[0]
        
        if date_to and "T" in date_to:
            date_to = date_to.split("T")[0]

        logger.info(f"Checking availability: {date_from} to {date_to or 'auto (+7 days)'}")

        # client.py already filters by working hours + buffer — no further filtering needed
        slots = await calcom_client.get_available_slots(date_from, date_to)

        if not slots:
            return (
                "No available appointment slots found in the requested range. "
                "Inform the caller politely and offer to take their details for a callback."
            )

        # ── Group slots by day ──
        slots_by_day = {}
        for s in slots:
            d = s["date"]
            if d not in slots_by_day:
                slots_by_day[d] = []
            slots_by_day[d].append(s)

        sorted_days = sorted(slots_by_day.keys())
        
        # Build a "Mini-Grid" report for the first 3 available days
        availability_report = []
        availability_report.append("### CLINIC AVAILABILITY SUMMARY")
        availability_report.append(f"Found openings on: {', '.join(sorted_days)}")
        availability_report.append("\n### DAILY BREAKDOWN (Mini-Grid)")

        for d in sorted_days[:7]: # Detail for next 7 days instead of just 3
            day_slots = slots_by_day[d]
            day_name = datetime.date.fromisoformat(d).strftime("%A, %B %d")
            
            # Detect "Wide Open" status
            if len(day_slots) >= 5:
                # WIDE OPEN: provide range
                start_t = day_slots[0]['display_time'].split(" at ")[-1]
                end_t = day_slots[-1]['display_time'].split(" at ")[-1]
                availability_report.append(f"\n- **{day_name}**: WIDE OPEN ({len(day_slots)} slots available)")
                availability_report.append(f"  Range: {start_t} to {end_t}")
                availability_report.append(f"  Strategy: You can say 'We are free all day! What time works for you?'")
            else:
                # BUSY: provide specific slots
                availability_report.append(f"\n- **{day_name}**: Limited availability ({len(day_slots)} slots)")
                for i, s in enumerate(day_slots, 1): # Show ALL available slots for the day
                    availability_report.append(f"  {i}. {s['display_time'].split(' at ')[-1]} (Ref: {s['time']})")

        instruction = (
            "If a day is 'WIDE OPEN', do not list specific times. Invite the caller to pick any time within the range. "
            "STRICT RULE: The clinic operates on a 45-minute cycle (e.g. 10:30, 11:15, 12:00). NEVER guess a time. "
            "If the user picks a time, you MUST find the EXACT match in the 'TECHNICAL SLOT MAPPING' below. "
            "If their time is not in the list, offer the closest available 45-minute slots instead. "
            "Copy the 'Ref ID' exactly. Do not invent ISO strings."
        )

        # ── TECHNICAL SLOT MAPPING (Hidden from user, used by Sarah's brain) ──
        # This allows Sarah to book ANY time she sees as available, even in Wide Open mode.
        tech_mapping = []
        tech_mapping.append("\n### TECHNICAL SLOT MAPPING (For internal booking use only - DO NOT SPEAK)")
        for s in slots:
            # Map "Monday 2:30 PM" -> "2026-04-20T14:30:00Z"
            time_part = s['display_time'].split(" at ")[-1]
            day_part = s['display_time'].split(" at ")[0]
            tech_mapping.append(f"- {day_part} {time_part} -> {s['time']}")

        return (
            "\n".join(availability_report) + 
            "\n" + "\n".join(tech_mapping) +
            f"\n\nIMPORTANT: Only book times that appear as 'available' in the tool data.\n"
            f"INSTRUCTION: {instruction}"
        )

    return check_availability


def create_book_appointment_tool(lifecycle_manager: Any) -> Callable[..., Any]:
    """Factory for the appointment booking tool."""
    @function_tool(
        name="book_appointment",
        description="Book a confirmed appointment. Call this ONLY after the caller picks a slot and provides name/email.",
    )
    async def book_appointment(
        start_time: Annotated[str, "The Ref string from check_availability (ISO format)."],
        name: Annotated[str, "Caller's full name."],
        email: Annotated[str, "Caller's email address."],
        phone: Annotated[str, "Caller's phone number."],
        reason: Annotated[Optional[str], "Reason for visit."] = "General Radiology",
    ) -> str:
        """Submits a booking request to Cal.com and records the outcome locally."""
        # Basic Guard against hallucinated Ref IDs
        if not ("T" in start_time and (start_time.endswith("Z") or "+" in start_time)):
             return (
                 f"ERROR: The Reference ID '{start_time}' is invalid or was hallucinated. "
                 f"You MUST use an exact Ref string from the TECHNICAL SLOT MAPPING in check_availability. "
                 f"Please apologize to the caller, check availability again, and offer a REAL 45-minute slot."
             )

        logger.info(f"Booking {name} at {start_time}")

        result = await calcom_client.create_booking(
            start_time=start_time,
            name=name,
            email=email,
            phone=phone,
            notes=reason,
        )

        if result.get("status") == "success":
            booking_data = result.get("data", {})
            event_id = str(booking_data.get("id", "booked"))

            # Fix #6 — convert UTC start_time to local clinic time for the confirmation message
            # Previously used raw UTC slice (e.g. "00:30" for a 10:30 AM Sydney booking)
            try:
                dt_utc = datetime.datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                display = _format_display_time(dt_utc, calcom_client.tz)
            except Exception:
                display = f"{start_time[:10]} at {start_time[11:16]}"

            lifecycle_manager.record_booking(
                event_id=event_id,
                date=start_time[:10],
                time=start_time[11:16],
                appointment_type=reason,
            )
            return (
                f"Confirmed! Appointment set for {display}. "
                f"Confirmation email sent to {email}."
            )

        return f"Booking failed: {result.get('message', 'Slot may have been taken.')}"

    return book_appointment
