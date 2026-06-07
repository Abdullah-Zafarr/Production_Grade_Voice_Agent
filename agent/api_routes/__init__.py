# agent/api_routes/__init__.py
from fastapi import APIRouter
from .webhooks import router as webhooks_router
from .recordings import router as recordings_router

router = APIRouter()
router.include_router(webhooks_router, prefix="/webhooks/livekit", tags=["Webhooks"])
router.include_router(recordings_router, prefix="/recordings", tags=["Recordings"])
