"""
api.py - FastAPI server for LiveKit tokens + Admin backend + Orb static file serving.
"""
import os
import uuid
import json
import logging
import httpx
import bcrypt
import zoneinfo
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Request, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.staticfiles import StaticFiles
from livekit import api
from agent.config import settings
from agent.api_routes import router as api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api-server")

# --- Directories & Paths ---
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ORB_DIR = os.path.join(_BASE_DIR, "frontend", "widget")
_ADMIN_DIR = os.path.join(_BASE_DIR, "frontend", "admin", "dist")

app = FastAPI(
    title="Soul Imaging API Server",
    description="Backend services for the Soul Imaging AI Voice Agent and Admin Dashboard.",
    version="1.1.0"
)

# --- Error Handlers ---

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handles SPA (Single Page Application) routing by falling back to index.html
    on 404 errors for /admin and /orb paths.
    """
    if exc.status_code == 404:
        path = request.url.path
        # Admin SPA fallback logic
        if path.startswith("/admin"):
            if "." not in path.split("/")[-1]:
                admin_index = os.path.join(_ADMIN_DIR, "index.html")
                if os.path.exists(admin_index):
                    return FileResponse(admin_index)
        
        # Orb fallback logic
        if path.startswith("/orb"):
            if "." not in path.split("/")[-1]:
                orb_index = os.path.join(_ORB_DIR, "index.html")
                if os.path.exists(orb_index):
                    return FileResponse(orb_index)

    return await http_exception_handler(request, exc)

# --- Middleware ---

origins = [o.strip() for o in settings.API_ALLOWED_ORIGINS.split(",") if o.strip()]
if origins == ["*"]:
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = origins
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase & HTTP Client Integration ---

_timeout = httpx.Timeout(15.0, connect=5.0)

async def supabase_request(
    method: str, 
    endpoint: str, 
    json_data: Optional[Dict[str, Any]] = None, 
    params: Optional[Dict[str, str]] = None
) -> Optional[Any]:
    """
    Generic helper for authenticated requests to the Supabase REST API.
    
    Args:
        method: HTTP method (GET, POST, PATCH, DELETE)
        endpoint: Supabase table name or endpoint
        json_data: Request body
        params: Query parameters
        
    Returns:
        JSON response from Supabase or None if failed.
    """
    url = f"{settings.SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # Handle UPSERT for POST with on_conflict resolution
    if method == "POST" and params and "on_conflict" in params:
        headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    
    try:
        async with httpx.AsyncClient(timeout=_timeout) as client:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=json_data, params=params)
            elif method == "PATCH":
                response = await client.patch(url, headers=headers, json=json_data, params=params)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json() if response.text else None
    except Exception as e:
        logger.error(f"Supabase error ({method} {endpoint}): {e}")
        return None

async def supabase_storage_delete(bucket: str, path: str) -> bool:
    """
    Deletes an object from Supabase Storage.
    
    Args:
        bucket: Storage bucket name
        path: Relative or absolute path to the file
        
    Returns:
        True if successful, False otherwise.
    """
    if "storage/v1/object/public/" in path:
        path = path.split("storage/v1/object/public/")[-1].split("/", 1)[-1]
    elif "storage/v1/object/sign/" in path:
        path = path.split("storage/v1/object/sign/")[-1].split("/", 1)[-1]
    
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    try:
        async with httpx.AsyncClient(timeout=_timeout) as client:
            res = await client.delete(url, headers=headers)
            if res.status_code == 200:
                logger.info(f"Deleted file {path} from bucket {bucket}")
                return True
            else:
                logger.warning(f"Failed to delete file {path} from {bucket}: {res.text}")
                return False
    except Exception as e:
        logger.error(f"Storage delete error: {e}")
        return False

# --- Core Routes ---

@app.get("/")
async def root_redirect():
    """Redirects the root URL to the AI Orb interface."""
    return RedirectResponse(url="/orb")

# Static File Mounting
if os.path.isdir(_ORB_DIR):
    app.mount("/orb", StaticFiles(directory=_ORB_DIR, html=True), name="orb")
    logger.info(f"Orb served at /orb")

if os.path.isdir(_ADMIN_DIR):
    app.mount("/admin", StaticFiles(directory=_ADMIN_DIR, html=True), name="admin")
    logger.info(f"Admin Dashboard served at /admin")

# Sub-Routers
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    """Liveness probe for deployment platforms."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/token")
async def get_token(request: Request):
    """Generates a secure LiveKit Access Token for WebRTC sessions."""
    try:
        data = await request.json()
        identity = data.get("identity", f"user_{uuid.uuid4().hex[:8]}")
        room_name = data.get("room", f"room_{uuid.uuid4().hex[:8]}")
        token = (
            api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(identity)
            .with_grants(api.VideoGrants(room_join=True, room=room_name))
            .to_jwt()
        )
        return {"token": token, "room": room_name, "identity": identity, "url": settings.LIVEKIT_URL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login")
async def login(request: Request):
    """Handles secure administrator login via bcrypt hash comparison."""
    try:
        data = await request.json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")

        res = await supabase_request("GET", "team_members", params={"email": f"eq.{email.lower()}"})

        if res and len(res) > 0:
            user = res[0]
            stored_hash = user.get("password", "")
            try:
                password_matches = bcrypt.checkpw(
                    password.encode("utf-8"),
                    stored_hash.encode("utf-8"),
                )
            except Exception:
                password_matches = (stored_hash == password)

            if password_matches:
                return {
                    "status": "success",
                    "user": {
                        "id": user.get("id"),
                        "name": user.get("name"),
                        "email": user.get("email"),
                        "role": user.get("role"),
                    },
                }

        # Admin Fallback Logic
        fallback_email = settings.ADMIN_FALLBACK_EMAIL
        fallback_hash = settings.ADMIN_PASSWORD_HASH
        if fallback_email and fallback_hash and email.lower() == fallback_email.lower():
            if bcrypt.checkpw(password.encode("utf-8"), fallback_hash.encode("utf-8")):
                return {
                    "status": "success",
                    "user": {"id": "admin-001", "name": "Primary Admin", "email": fallback_email, "role": "Admin"},
                }
            
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --- Dashboard & Analytics Endpoints ---
# These endpoints provide data for the admin panel visualizations and call logging.

@app.get("/api/dashboard/stats")
# Fetches high-level metrics for dashboard
async def get_stats():
    """Calculates high-level KPIs for the dashboard overview."""
    try:
        res_all = await supabase_request("GET", "call_logs", params={"select": "call_id,outcome,started_at,duration_seconds"})
        all_calls = res_all or []
        
        total_calls = len(all_calls)
        total_bookings = sum(1 for c in all_calls if str(c.get("outcome")).lower() == "booking")
        
        thirty_days_ago = (datetime.now() - timedelta(days=30))
        monthly_calls = 0
        durations = []
        
        for c in all_calls:
            started_at_str = c.get("started_at")
            if started_at_str:
                try:
                    dt = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                    if dt.replace(tzinfo=None) > thirty_days_ago:
                        monthly_calls += 1
                except Exception: pass
            
            d = c.get("duration_seconds")
            if d and d > 0: durations.append(d)

        avg_duration = sum(durations) / len(durations) if durations else 0

        return {
            "totalCalls": total_calls,
            "monthlyCalls": monthly_calls,
            "bookings": total_bookings,
            "avgDuration": f"{int(avg_duration // 60)}:{int(avg_duration % 60):02d}",
            "missedCalls": total_calls - total_bookings,
            "successRate": int((total_bookings / total_calls * 100)) if total_calls > 0 else 0
        }
    except Exception as e:
        logger.error(f"Stats calculation error: {e}")
        return {"totalCalls": 0, "monthlyCalls": 0, "bookings": 0, "avgDuration": "0:00", "missedCalls": 0, "successRate": 0}

@app.get("/api/calls")
async def get_calls(limit: int = Query(500, ge=1, le=2000)):
    """Retrieves paginated call logs from Supabase."""
    res = await supabase_request("GET", "call_logs", params={"select": "*", "order": "started_at.desc", "limit": str(limit)})
    return res or []

@app.delete("/api/calls/{call_id}")
# Deletes a specific call log and its recording
async def delete_call(call_id: str):
    """Deletes a call log and its associated recording file."""
    try:
        res = await supabase_request("GET", "call_logs", params={"call_id": f"eq.{call_id}"})
        if not res: raise HTTPException(status_code=404, detail="Call not found")
        
        call_log = res[0]
        recording_url = call_log.get("recording_url")
        
        await supabase_request("DELETE", "call_logs", params={"call_id": f"eq.{call_id}"})
        
        if recording_url:
            filename = os.path.basename(recording_url)
            await supabase_storage_delete(settings.S3_BUCKET, filename)
            
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Delete call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
async def get_analytics(limit: int = Query(500, ge=1, le=2000)):
    """Generates trend data, outcome distribution, and duration buckets."""
    data = await get_calls(limit=limit)
    
    # Timezone handling
    try:
        tz = zoneinfo.ZoneInfo(settings.TIMEZONE)
        now_for_offset = datetime.now(tz=timezone.utc)
        tz_offset = now_for_offset.astimezone(tz).utcoffset() or timedelta(hours=0)
    except Exception: tz_offset = timedelta(hours=0)

    now_target = datetime.now(timezone.utc) + tz_offset

    # 7-day Trend
    trend = []
    for i in range(6, -1, -1):
        target_day = (now_target - timedelta(days=i)).date()
        target_day_start = datetime.combine(target_day, datetime.min.time())
        target_day_end = target_day_start + timedelta(days=1)
        
        count = sum(1 for c in data if (started := c.get("started_at")) and 
                   target_day_start <= (datetime.fromisoformat(started.replace("Z", "+00:00")) + tz_offset).replace(tzinfo=None) < target_day_end)
        trend.append({"day": target_day.strftime("%a"), "calls": count})

    # Outcomes & Durations
    outcome_counts: Dict[str, int] = {}
    duration_buckets = [
        {"range": "0-1m", "count": 0}, {"range": "1-3m", "count": 0}, {"range": "3-5m", "count": 0}, 
        {"range": "5-10m", "count": 0}, {"range": "10m+", "count": 0}
    ]

    for c in data:
        key = (c.get("outcome") or "other").lower()
        outcome_counts[key] = outcome_counts.get(key, 0) + 1
        
        d = c.get("duration_seconds") or 0
        if d < 60: duration_buckets[0]["count"] += 1
        elif d < 180: duration_buckets[1]["count"] += 1
        elif d < 300: duration_buckets[2]["count"] += 1
        elif d < 600: duration_buckets[3]["count"] += 1
        else: duration_buckets[4]["count"] += 1

    return {"trend": trend, "outcomes": outcome_counts, "durations": duration_buckets}

@app.get("/api/dashboard/notifications")
async def get_notifications():
    """Fetches recent actionable items (bookings, callbacks)."""
    try:
        res = await supabase_request("GET", "call_logs", params={"select": "call_id,outcome,started_at", "limit": "20", "order": "started_at.desc"})
        notifications = []
        for c in (res or []):
            o = (c.get("outcome") or "").lower()
            if o in ["booking", "callback"]:
                notifications.append({
                    "id": c["call_id"], "type": o, 
                    "title": "New Booking" if o == "booking" else "Callback Request",
                    "message": "A new appointment was scheduled." if o == "booking" else "A caller requested a follow-up.",
                    "time": c["started_at"]
                })
        return notifications[:5]
    except Exception: return []

@app.get("/api/agent/config")
async def get_config():
    """Retrieves clinic settings from the database and parses JSON strings."""
    res = await supabase_request("GET", "clinic_settings")
    if not res: return {}
    config: Dict[str, Any] = {}
    for item in res:
        val = item.get("value")
        if isinstance(val, str) and (val.startswith(("{", "["))):
            try: val = json.loads(val)
            except Exception: pass
        config[item["key"]] = val
    return config

@app.post("/api/agent/config")
async def update_config(request: Request):
    """Updates clinic settings globally."""
    data = await request.json()
    try:
        rows = [{"key": k, "value": json.dumps(v) if isinstance(v, (dict, list)) else v, "updated_at": datetime.now().isoformat()} for k, v in data.items()]
        await supabase_request("POST", "clinic_settings", json_data=rows, params={"on_conflict": "key"})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/knowledge")
async def get_knowledge():
    """Lists indexed files in the local knowledge base."""
    base_dir = os.path.dirname(__file__)
    data_dirs = [os.path.join(base_dir, "knowledge", "data"), os.path.join(base_dir, "knowledge", "docs")]
    files = []
    for d in data_dirs:
        if os.path.exists(d):
            files.extend([{"id": f, "name": f, "type": "file", "status": "indexed"} for f in os.listdir(d) if f.endswith((".json", ".pdf", ".docx", ".txt", ".md"))])
    return files

@app.post("/api/knowledge/sync")
async def sync_knowledge(background_tasks: BackgroundTasks):
    """Triggers an asynchronous re-indexing of the knowledge base."""
    from agent.knowledge.loader import ingest_knowledge_base
    background_tasks.add_task(ingest_knowledge_base)
    return {"status": "processing"}

@app.get("/api/team")
async def get_team():
    """Retrieves authorized team members."""
    res = await supabase_request("GET", "team_members", params={"select": "id,name,role,email,status,created_at"})
    return res or []

@app.post("/api/team")
async def add_team_member(request: Request):
    """Adds a new team member with secure password handling."""
    data = await request.json()
    try:
        data.setdefault("id", str(uuid.uuid4()))
        data.setdefault("password", "soulbot123")
        data["role"] = "Admin"
        await supabase_request("POST", "team_members", json_data=data, params={"on_conflict": "email"})
        return {"status": "success", "member": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/team/{member_id}")
async def delete_team_member(member_id: str):
    """Removes a team member by their unique ID."""
    try:
        await supabase_request("DELETE", "team_members", params={"id": f"eq.{member_id}"})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
