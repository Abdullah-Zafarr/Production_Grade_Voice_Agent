# Call Recording & Audio Pipeline - Technical Manual

This document explains the implementation of the automatic call recording, MP3 conversion, and manual recovery system for the Soul Imaging Voice Agent.

## 🏗️ System Architecture

The recording pipeline follows a 5-step lifecycle:
1. **Trigger**: The Agent Worker starts a LiveKit Egress.
2. **Capture**: LiveKit records the room audio and uploads it to Supabase (S3) as a raw file.
3. **Notify**: LiveKit sends a webhook event (`egress_ended`) to our API.
4. **Convert**: Our API downloads the raw file, converts it to MP3 via FFmpeg, and re-uploads it.
5. **Sync**: The database is updated with the final MP3 URL and duration.

---

## 📂 Updated Files & Their Roles

### 1. Backend Core
- **`agent/main.py`**: 
    - **Update**: Added `start_session_recording()` function.
    - **Logic**: Uses the LiveKit API to start a `RoomCompositeEgress` as soon as the agent connects to a room. 
    - **Format**: Initially captures in `.webm` or `.ogg` for low-latency streaming.
- **`agent/api_routes/webhooks.py`**: 
    - **Update**: The "Brain" of the recording system.
    - **Logic**: Listens for the `egress_ended` status. Once received, it triggers a background task to process the audio.
    - **Conversion**: Uses `ffmpeg` to transform raw audio into high-quality `128k` MP3 files.
- **`agent/config.py`**: 
    - **Update**: Added S3/Supabase configuration tokens to allow the server to talk to the storage buckets.

### 2. Frontend Configuration
- **`frontend/Soulbot_Updated/Admin/.env.local`**: 
    - **Update**: Points the Admin Dashboard to the correct API domain (Local IP or Fly.io) so it can fetch recording links.
- **`frontend/Soulbot_Updated/Frontend/script.js`**: 
    - **Update**: Pointed the user-facing Orb frontend to the production API so it can request session tokens.

### 3. Utility & Recovery
- **`trigger_conversion.py`**: 
    - **Purpose**: A "fail-safe" script. If a webhook is missed (e.g., server was down), you can run `python trigger_conversion.py <room_name>` to manually trigger the conversion and update the dashboard.

---

## 🛠️ How it Works (Step-by-Step)

1. **Egress Initialization**: 
   When a user clicks "Connect", the agent worker joins the room and immediately calls `start_room_composite_egress`. It sends the raw audio stream directly to the `recordings` bucket in Supabase.

2. **Webhook Processing**: 
   When the call hangs up, LiveKit sends a JSON payload to `/api/webhooks/livekit`.
   The server verifies the signature (security check) and extracts the `egress_id`.

3. **Audio Transformation**: 
   The server sees a raw file (e.g., `call_123.ogg`). It downloads it to a temporary folder, runs:
   `ffmpeg -i input.ogg -acodec libmp3lame output.mp3`
   This makes the file playable in any browser (Chrome/Safari/Mobile).

4. **Database Finalization**: 
   The final MP3 path is saved to the `call_logs` table in Supabase. The Admin Dashboard sees this change and automatically displays the "Play" button.

---

## 🚀 Deployment Checklist

To keep this working in production:
1. **FFmpeg**: Ensure `ffmpeg` is installed on the server (installed by default on Fly.io via Dockerfile).
2. **Webhook URL**: The LiveKit dashboard **MUST** point to `https://your-domain.com/api/webhooks/livekit`.
3. **S3 Credentials**: `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` must be set in your environment variables.

---
**Status**: `REDUNDANT & STABLE`
**Manual Created**: 2026-04-25
