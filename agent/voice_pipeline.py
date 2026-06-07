"""
voice_pipeline.py — Configures the underlying STT, LLM, and TTS plugins for the agent.
"""
import logging
from typing import Optional
from livekit.plugins import openai as lk_openai
from livekit.plugins import cartesia, gladia, silero
from livekit.agents import stt, tts, vad
from agent.config import settings

logger = logging.getLogger("voice-pipeline")

def get_stt() -> stt.STT:
    """Initializes the Gladia STT plugin optimized for English transcription."""
    logger.info("Initializing Gladia STT (English only)...")
    return gladia.STT(
        languages=["en"],
        code_switching=False,
    )

def get_llm() -> lk_openai.LLM:
    """Initializes the OpenAI LLM with a validated model name from settings."""
    # List of models currently supported by the LiveKit OpenAI plugin
    VALID_MODELS = {
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "o1",
        "o1-mini",
        "o1-preview",
        "o3-mini",
    }
    model_name = settings.OPENAI_MODEL
    if model_name not in VALID_MODELS:
        logger.warning(
            f"Unrecognised model '{model_name}' in .env, falling back to gpt-4o-mini"
        )
        model_name = "gpt-4o-mini"

    return lk_openai.LLM(
        model=model_name,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
        parallel_tool_calls=False, # Reduces TTFT significantly
    )


def get_tts(voice_id: Optional[str] = None) -> tts.TTS:
    """Initializes the Cartesia TTS plugin for ultra-low latency speech."""
    logger.info("Initializing Cartesia TTS...")
    return cartesia.TTS(
        model="sonic-3",
        api_key=settings.CARTESIA_API_KEY,
        voice=voice_id or settings.CARTESIA_VOICE_ID,
    )

def get_vad() -> vad.VAD:
    """Initializes the Silero VAD model for robust silence detection."""
    return silero.VAD.load(
        min_silence_duration=0.4,
        activation_threshold=0.5,
    )
