import logging
import httpx
import json
import time
import asyncio
from agent.config import settings

logger = logging.getLogger("settings-manager")
_CACHE_TTL_SECONDS = 30

_LIVE_CONFIG: dict = {}
_LAST_REFRESH: float = 0


def _coerce_value(value):
    """Parses JSON strings into objects if they are valid JSON."""
    if not isinstance(value, str):
        return value
    v = value.strip()
    if (v.startswith("{") and v.endswith("}")) or (v.startswith("[") and v.endswith("]")):
        try:
            return json.loads(v)
        except Exception:
            return value
    return value

async def get_dynamic_config(force_refresh: bool = False):
    """Fetches dynamic agent configuration from Supabase with local caching."""
    global _LIVE_CONFIG, _LAST_REFRESH
    now = time.time()
    
    # Return cached data if fresh
    if not force_refresh and _LIVE_CONFIG and (now - _LAST_REFRESH) < _CACHE_TTL_SECONDS:
        return _LIVE_CONFIG

    url = f"{settings.SUPABASE_URL}/rest/v1/clinic_settings"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            config = {}
            for item in data:
                config[item["key"]] = _coerce_value(item.get("value"))
            
            _LIVE_CONFIG = config
            _LAST_REFRESH = now
            logger.info("Dynamic settings refreshed successfully.")
            return _LIVE_CONFIG
        except Exception as e:
            logger.error(f"Settings refresh failed: {e}")
            return _LIVE_CONFIG or {}

def get_agent_identity_sync() -> dict:
    """Reads identity data from memory cache without blocking."""
    return _LIVE_CONFIG.get('agent_identity', {})

def get_agent_prompt_sync() -> tuple:
    """Reads prompt and greeting data from memory cache without blocking."""
    prompt_data = _LIVE_CONFIG.get('agent_prompt', {})
    return prompt_data.get('instructions'), prompt_data.get('greeting')

async def refresh_dynamic_config():
    """Manually triggers a background refresh of the settings cache."""
    return await get_dynamic_config(force_refresh=True)

async def start_settings_poller():
    """Background loop to periodically sync settings from Supabase."""
    while True:
        await refresh_dynamic_config()
        await asyncio.sleep(_CACHE_TTL_SECONDS)
