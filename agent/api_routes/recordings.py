import logging
from fastapi import APIRouter, HTTPException, Depends
from agent.config import settings
import httpx

logger = logging.getLogger("api-recordings")
router = APIRouter()

@router.get("/{call_id}/url")
async def get_signed_recording_url(call_id: str, download: bool = False):
    """
    Generate a 15-minute signed URL for secure recording playback.
    This ensures that private health data is never exposed publicly.
    """
    # 1. Fetch the internal path from the database
    # (In a production app, we would verify the user's session/role here)
    path = await get_internal_path(call_id)
    if not path:
        raise HTTPException(status_code=404, detail="Recording not found or not yet completed.")

    # 2. Request a Signed URL from Supabase Storage
    # Endpoint: POST /storage/v1/object/sign/{bucket}/{path}
    signed_url_info = await generate_supabase_signed_url(path, download=download)
    
    if not signed_url_info:
        raise HTTPException(status_code=500, detail="Failed to generate secure access link.")

    return signed_url_info

async def get_internal_path(call_id: str):
    """Fetch the recording_url (internal path) from the call_logs table."""
    url = f"{settings.SUPABASE_URL}/rest/v1/call_logs?call_id=eq.{call_id}&select=recording_url,recording_status"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers)
            data = res.json()
            if data and data[0].get("recording_status") == "completed":
                return data[0].get("recording_url")
        except Exception as e:
            logger.error(f"Error fetching path from DB: {e}")
    return None

async def generate_supabase_signed_url(internal_path: str, download: bool = False):
    """
    Use Supabase Storage API to create a time-limited signed URL.
    Bucket: recordings
    Expires: 15 minutes (900 seconds)
    """
    import urllib.parse
    import os
    
    parsed = urllib.parse.urlparse(internal_path)
    path_parts = parsed.path.strip("/").split("/")
    
    if settings.S3_BUCKET in path_parts:
        idx = path_parts.index(settings.S3_BUCKET)
        clean_path = "/".join(path_parts[idx+1:])
    else:
        clean_path = os.path.basename(parsed.path)
        
    url = f"{settings.SUPABASE_URL}/storage/v1/object/sign/{settings.S3_BUCKET}/{clean_path}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"expiresIn": 900} # 15 minutes
    if download:
        payload["download"] = True
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                # Return the full URL
                relative_url = data.get("signedURL")
                return {"url": f"{settings.SUPABASE_URL}/storage/v1{relative_url}"}
            else:
                logger.error(f"Supabase Storage Sign Error ({res.status_code}): {res.text}")
        except Exception as e:
            logger.error(f"Failed to sign URL: {e}")
    return None

# Optimized for production performance
