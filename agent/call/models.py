"""
models.py — Data models for call records and caller information.
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field

class CallOutcome(str, Enum):
    BOOKING = "booking"
    INQUIRY = "inquiry"
    CALLBACK = "callback"
    TRANSFER = "transfer"
    NO_ANSWER = "no_answer"
    OTHER = "other"

class CallerData(BaseModel):
    """Structured data collected during the call."""
    full_name: Optional[str] = Field(None, description="The caller's full name")
    phone_number: Optional[str] = Field(None, description="The caller's contact phone number")
    email: Optional[str] = Field(None, description="The caller's email address")
    inquiry_type: Optional[str] = Field(None, description="The primary reason for the call")
    preferred_contact_time: Optional[str] = Field(None, description="When the caller prefers to be reached")
    custom_fields: dict = Field(default_factory=dict, description="Additional arbitrary metadata collected")

class BookingRecord(BaseModel):
    """Details of a booked appointment."""
    event_id: str = Field(..., description="Unique ID of the Cal.com event")
    appointment_date: str = Field(..., description="Date of the appointment (YYYY-MM-DD)")
    appointment_time: str = Field(..., description="Time of the appointment")
    appointment_type: str = Field(..., description="Type of appointment booked")

class CallRecord(BaseModel):
    """Complete record of a single call."""
    call_id: str = Field(..., description="Unique UUID for this call")
    room_name: str = Field(..., description="The LiveKit room name")
    started_at: datetime = Field(..., description="ISO timestamp of when the call started")
    ended_at: Optional[datetime] = Field(None, description="ISO timestamp of when the call ended")
    duration_seconds: Optional[float] = Field(None, description="Total duration of the call in seconds")
    outcome: CallOutcome = Field(CallOutcome.OTHER, description="The final classification of the call")
    summary: Optional[str] = Field(None, description="AI-generated summary of the conversation")
    caller_data: CallerData = Field(default_factory=CallerData, description="Structured info collected from the caller")
    booking: Optional[BookingRecord] = Field(None, description="Details if a booking was made")
    transcript: list[dict] = Field(default_factory=list, description="Full message-by-message transcript")
    recording_url: Optional[str] = Field(None, description="S3 path or URL to the recording file")
    recording_status: Optional[str] = Field("none", description="Current status of the recording (none, completed, failed)")
    recording_duration_seconds: Optional[float] = Field(None, description="Duration of the recorded file")
