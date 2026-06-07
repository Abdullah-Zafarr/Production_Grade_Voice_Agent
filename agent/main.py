"""
main.py - Flawless & Concurrency-Safe LiveKit Agent Worker.
Handles real-time voice interactions and call lifecycle management.
"""
import logging
import asyncio

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    voice,
    AgentSession,
)

from agent.voice_pipeline import get_stt, get_llm, get_tts, get_vad
from agent.knowledge.loader import ingest_knowledge_base
from agent.call.lifecycle import CallLifecycleManager
from agent.prompt import build_system_prompt
from agent.tools import get_all_tools
from agent.config import settings
from agent.settings import get_agent_identity_sync, get_agent_prompt_sync, start_settings_poller

async def start_session_recording(room_name: str, call_id: str = None):
    """Programmatically start a RoomCompositeEgress to record the session to S3."""
    from livekit.api import LiveKitAPI, RoomCompositeEgressRequest, EncodedFileOutput, S3Upload
    from agent.config import settings
    
    # Use call_id for the filename if provided, otherwise fallback to room_name
    identifier = call_id or room_name
    
    # Derive S3 endpoint from Supabase URL
    try:
        project_id = settings.SUPABASE_URL.split("//")[1].split(".")[0]
        s3_endpoint = f"https://{project_id}.supabase.co/storage/v1/s3"
        
        # Initialize API (ensure https for API calls)
        api_url = settings.LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
        lkapi = LiveKitAPI(api_url, settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        
        # Prioritize explicit S3 credentials from .env
        access_key = settings.S3_ACCESS_KEY_ID or project_id
        secret = settings.S3_SECRET_ACCESS_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
        
        # Clean up endpoint and region
        endpoint = (settings.S3_ENDPOINT or s3_endpoint).rstrip('/')
        region = settings.S3_REGION or "ap-southeast-2"

        output = EncodedFileOutput(
            filepath=f"{identifier}.webm",
            s3=S3Upload(
                access_key=access_key,
                secret=secret,
                bucket=settings.S3_BUCKET,
                endpoint=endpoint,
                region=region,
                force_path_style=True
            )
        )
        
        await lkapi.egress.start_room_composite_egress(
            RoomCompositeEgressRequest(
                room_name=room_name,
                audio_only=True,
                file=output
            )
        )
        logger.info(f"REC: Recording started for room {room_name} as {identifier}.webm")
        await lkapi.aclose()
    except Exception as e:
        logger.error(f"REC: Failed to start recording: {e}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soulbot-worker")

async def prewarm(proc):
    """Pre-load heavy assets during worker boot."""
    proc.userdata["vad"] = get_vad()
    logger.info("VAD Model Pre-loaded.")
    
    # Fire off heavy background tasks
    asyncio.create_task(ingest_knowledge_base())
    asyncio.create_task(start_settings_poller())
    logger.info("Background pre-warming (KB + Config Poller) started.")

# Main entry point for the LiveKit worker
async def entrypoint(ctx: JobContext):
    """Restored entrypoint using Agent + AgentSession with improved reliability."""
    logger.info(f"Connecting to room: {ctx.room.name}")
    
    # 1. Connect immediately
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1b. Start recording automatically (using UUID for filename)
    lifecycle = CallLifecycleManager(ctx.room.name)
    asyncio.create_task(start_session_recording(ctx.room.name, lifecycle.record.call_id))
    
    # Define stop_event early for scoping in callbacks
    stop_event = asyncio.Event()

    # 2. Get Settings
    identity = get_agent_identity_sync()
    instructions, greeting = get_agent_prompt_sync()
    
    # Background DB initialization so it doesn't block the greeting
    asyncio.create_task(lifecycle.initialize())

    # 3. Initialize Agent
    base_instructions = instructions or build_system_prompt()
    
    import datetime
    import zoneinfo
    tz = zoneinfo.ZoneInfo(settings.TIMEZONE)
    now_sydney = datetime.datetime.now(tz)
    date_header = (
        f"### SYSTEM TIME CONTEXT\n"
        f"- Current Date: {now_sydney.strftime('%A, %B %d, %Y')}\n"
        f"- Current Time: {now_sydney.strftime('%I:%M %p')} (Sydney Time)\n"
        f"- Location: Sydney, Australia\n"
        f"--------------------------------------------------\n\n"
    )
    
    stt_email_fix = (
        "\n\n### CRITICAL STT EMAIL CORRECTION INSTRUCTION ###\n"
        "Speech-to-text often misinterprets email addresses. If you hear:\n"
        "- 'at the rate', 'at the red', or 'at the right' -> interpret as '@'\n"
        "- 'dot com' -> interpret as '.com'\n"
        "Example: 'abdullah at the rate gmail dot com' MUST be processed and saved as 'abdullah@gmail.com'.\n"
        "Always internally correct these transcription errors before confirming or saving an email address.\n"
    )
    
    final_instructions = date_header + base_instructions + stt_email_fix

    agent = voice.Agent(
        stt=get_stt(),
        llm=get_llm(),
        tts=get_tts(),
        vad=ctx.proc.userdata.get("vad", get_vad()) if hasattr(ctx, "proc") else get_vad(),
        instructions=final_instructions,
        tools=get_all_tools(lifecycle),
        min_endpointing_delay=0.5,
        max_endpointing_delay=1.0,
    )

    # 4. Initialize Session
    session = AgentSession(
        user_away_timeout=12.0, # Requirement: Close call after 12s of user silence
        aec_warmup_duration=0.1,
        preemptive_generation=True,
    )

    # --- REAL TIME TRANSCRIPT SYNC & AUTO-CLOSE ---
    @session.on("transcript_finished")
    def _on_transcript_finished(t):
        # Fire and forget sync to avoid blocking the voice loop
        asyncio.create_task(sync_current_transcript())
        
        # Check for closing keywords to trigger the 12s hangup requirement
        # We check the last assistant message
        try:
            last_msg = ""
            if hasattr(agent.chat_ctx, "messages"):
                msgs = agent.chat_ctx.messages() if callable(agent.chat_ctx.messages) else agent.chat_ctx.messages
                if msgs and msgs[-1].role == "assistant":
                    last_msg = str(msgs[-1].content).lower()
            
            closing_keywords = ["goodbye", "wonderful day", "take care", "bye bye", "have a nice day"]
            if any(k in last_msg for k in closing_keywords):
                logger.info(f"Closing detected in '{last_msg}'. Setting 12s disconnect timer...")
                async def delayed_disconnect():
                    await asyncio.sleep(12)
                    if not stop_event.is_set():
                        logger.info("12s elapsed after goodbye. Disconnecting call...")
                        stop_event.set()
                asyncio.create_task(delayed_disconnect())
        except Exception as e:
            logger.error(f"Auto-close detection failed: {e}")

    async def sync_current_transcript():
        transcript = []
        try:
            messages = []
            if hasattr(agent.chat_ctx, "messages"):
                messages = agent.chat_ctx.messages() if callable(agent.chat_ctx.messages) else agent.chat_ctx.messages
            elif hasattr(agent.chat_ctx, "items"):
                messages = agent.chat_ctx.items

            for item in messages:
                role = getattr(item, "role", None)
                if role in ("user", "assistant"):
                    content = str(getattr(item, "content", ""))
                    if role == "user":
                        import re
                        content = re.sub(r'(?i)\bat the rate\b', '@', content)
                        content = re.sub(r'(?i)\bat the red\b', '@', content)
                        content = re.sub(r'(?i)\bat the right\b', '@', content)
                        content = re.sub(r'(?i)\bdot com\b', '.com', content)
                        content = re.sub(r'(?i)\bdot\b', '.', content)
                        content = re.sub(r'\s*@\s*', '@', content)
                        content = re.sub(r'\s*\.\s*', '.', content)
                    transcript.append({"role": role, "content": content})
            
            await lifecycle.sync_transcript(transcript)
        except Exception as e:
            logger.error(f"Incremental sync failed: {e}")

    # 5. Start
    await session.start(agent, room=ctx.room)
    logger.info(f"Session established for {identity.get('name', 'Sarah')}")

    # 6. Greeting
    recording_disclosure = "This call is being recorded to ensure medical documentation accuracy. "
    final_greeting = recording_disclosure + (greeting or f"Hello, I am {settings.AGENT_NAME} from {settings.CLINIC_NAME}. How can I help you today?")
    
    # We await here but it will happen much faster now that DB and recording are backgrounded
    await session.say(final_greeting, allow_interruptions=True)

    # 7. Wait and Finalize (Robust Pattern)
    @ctx.add_shutdown_callback
    async def _on_job_shutdown():
        stop_event.set()

    logger.info("Agent session active. Sarah is waiting for your input...")
    
    try:
        await stop_event.wait()
    except asyncio.CancelledError:
        logger.info("Job cancelled, finalizing call logs...")
    except Exception as e:
        logger.error(f"Unexpected error in session: {e}")
    finally:
        # This block is GUARANTEED to run even if the job is cancelled by LiveKit
        logger.info("Finalizing call lifecycle...")
        transcript = []
        try:
            # Safely extract messages from ChatContext
            messages = []
            if hasattr(agent.chat_ctx, "messages"):
                messages = agent.chat_ctx.messages() if callable(agent.chat_ctx.messages) else agent.chat_ctx.messages
            elif hasattr(agent.chat_ctx, "items"):
                messages = agent.chat_ctx.items

            for item in messages:
                role = getattr(item, "role", None)
                if role in ("user", "assistant"):
                    content = str(getattr(item, "content", ""))
                    if role == "user":
                        import re
                        content = re.sub(r'(?i)\bat the rate\b', '@', content)
                        content = re.sub(r'(?i)\bat the red\b', '@', content)
                        content = re.sub(r'(?i)\bat the right\b', '@', content)
                        content = re.sub(r'(?i)\bdot com\b', '.com', content)
                        content = re.sub(r'(?i)\bdot\b', '.', content)
                        content = re.sub(r'\s*@\s*', '@', content)
                        content = re.sub(r'\s*\.\s*', '.', content)
                    transcript.append({"role": role, "content": content})
        except Exception as e:
            logger.error(f"Error building transcript history: {e}")

        await lifecycle.finalize(transcript)
        logger.info("Call lifecycle saved and finalized.")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
