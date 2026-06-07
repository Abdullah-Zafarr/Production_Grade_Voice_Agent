import logging
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
from livekit.api import WebhookReceiver
from agent.config import settings
import os
import subprocess
import tempfile
import httpx

logger = logging.getLogger("api-webhooks")
router = APIRouter()

@router.post("")
async def livekit_webhook(request: Request, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    """
    Handle LiveKit webhooks, specifically for EGRESS_ENDED events.
    """
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        logger.error("LiveKit credentials missing in settings.")
        raise HTTPException(status_code=500, detail="Server configuration error")

    # 1. Verify Signature
    body = await request.body()
    from livekit.api import TokenVerifier
    verifier = TokenVerifier(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    receiver = WebhookReceiver(verifier)
    
    try:
        event = receiver.receive(body.decode("utf-8"), authorization)
    except Exception as e:
        logger.warning(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # 2. Handle EGRESS_ENDED
    logger.info(f"Webhook event received: {event.event}")
    if event.event == "egress_ended":
        egress_info = event.egress_info
        egress_id = egress_info.egress_id
        status = egress_info.status
        
        logger.info(f"Egress Ended: {egress_id}, Status: {status}, File Results: {egress_info.file_results}")
        
        # Check if it was successful
        if status == 2: # EGRESS_COMPLETE
            # Extract file results
            file_results = egress_info.file_results
            if file_results:
                # We expect recordings/call_id.mp3
                # LiveKit returns the confirmed URL or path
                confirmed_path = file_results[0].location
                duration = egress_info.duration / 1_000_000_000 # Convert nanoseconds to seconds
                
                # Extract call_id from the filename dynamically regardless of prefix/extension
                import os
                from urllib.parse import urlparse
                
                # Get the path without query parameters
                parsed_url = urlparse(confirmed_path)
                filename = os.path.basename(parsed_url.path)
                call_id, _ = os.path.splitext(filename)
                
                # If call_id is still empty or looks wrong, fallback to room_name
                if not call_id or call_id == "composite":
                    logger.warning(f"REC: Filename {filename} is generic. Trying room_name as fallback.")
                    call_id = egress_info.room_name
                
                if call_id:
                    logger.info(f"REC: Triggering conversion for {call_id} from {confirmed_path}")
                    # Start conversion in background to avoid blocking LiveKit webhook
                    background_tasks.add_task(process_recording_conversion, call_id, confirmed_path, duration)
                else:
                    logger.warning(f"Could not extract call_id from path: {confirmed_path}")
        elif status == 3: # EGRESS_FAILED
            logger.error(f"Egress job failed: {egress_id}")
            # We could update the DB with 'failed' status here if we had the call_id
            
    return {"status": "ok"}

async def update_call_recording(identifier: str, path: str, duration: float):
    """Update the call record in Supabase with the confirmed recording info."""
    url = f"{settings.SUPABASE_URL}/rest/v1/call_logs?or=(call_id.eq.{identifier},room_name.eq.{identifier})"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "recording_url": path,
        "recording_status": "completed",
        "recording_duration_seconds": duration
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.patch(url, json=payload, headers=headers)
            if res.status_code >= 400:
                logger.error(f"Failed to update call recording in DB: {res.text}")
            else:
                logger.info(f"Database updated for call {identifier}: {path}")
        except Exception as e:
            logger.error(f"DB Update error: {e}")

async def process_recording_conversion(call_id: str, raw_path: str, duration: float):
    """
    Downloads raw .webm from Supabase, converts to .mp3 via FFmpeg,
    uploads back to Supabase, and updates the database.
    """
    import os
    
    # We only want to process if it's NOT already an mp3
    if raw_path.endswith(".mp3"):
        logger.info(f"REC: Recording for {call_id} is already MP3. Skipping conversion.")
        await update_call_recording(call_id, raw_path, duration)
        return

    logger.info(f"REC: Starting conversion for {call_id} (Raw: {raw_path})")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_file = os.path.join(tmpdir, "input.webm")
        output_file = os.path.join(tmpdir, f"{call_id}.mp3")
        
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }

        # 1. Download
        try:
            # Handle potential full URLs or relative paths
            filename = os.path.basename(raw_path)
            download_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.S3_BUCKET}/{filename}"
            
            async with httpx.AsyncClient() as client:
                res = await client.get(download_url, headers=headers)
                if res.status_code != 200:
                    logger.error(f"REC: Failed to download raw recording: {res.text}")
                    return
                
                with open(input_file, "wb") as f:
                    f.write(res.content)
            
            logger.info(f"REC: Downloaded {filename}")

            # 2. Convert via FFmpeg
            # Command: ffmpeg -i input.webm -vn -acodec libmp3lame -ab 128k output.mp3
            cmd = [
                "ffmpeg", "-y", "-i", input_file,
                "-vn", "-acodec", "libmp3lame", "-ab", "128k",
                output_file
            ]
            
            process = subprocess.run(cmd, capture_output=True, text=True)
            if process.returncode != 0:
                logger.error(f"REC: FFmpeg failed for {call_id}. Return code: {process.returncode}")
                logger.error(f"REC: FFmpeg STDERR: {process.stderr}")
                return
            
            logger.info(f"REC: Converted to MP3: {output_file}")

            # 3. Upload MP3
            upload_filename = f"{call_id}.mp3"
            upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.S3_BUCKET}/{upload_filename}"
            
            with open(output_file, "rb") as f:
                async with httpx.AsyncClient() as client:
                    # Supabase Storage Upload requires x-upsert header to overwrite if exists
                    res = await client.post(
                        upload_url,
                        headers={**headers, "Content-Type": "audio/mpeg", "x-upsert": "true"},
                        content=f.read()
                    )
                    if res.status_code >= 400:
                        logger.error(f"REC: Upload failed: {res.text}")
                        return
            
            logger.info(f"REC: Uploaded {upload_filename}")

            # 4. Update Database
            # Construct a clean path for storage (bucket/file)
            final_path = f"{settings.S3_BUCKET}/{upload_filename}"
            await update_call_recording(call_id, final_path, duration)

            # 5. Cleanup Raw File from Supabase (Optional)
            if raw_path.endswith(".webm"):
                async with httpx.AsyncClient() as client:
                    await client.delete(download_url, headers=headers)
                    logger.info(f"REC: Deleted raw file {filename}")

        except Exception as e:
            logger.error(f"REC: Pipeline failure for {call_id}: {e}")
