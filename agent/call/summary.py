"""
summary.py — Generates a structured call summary using the LLM after the call ends.
"""
from openai import AsyncOpenAI
from agent.config import settings

async def generate_call_summary(transcript: list[dict], caller_data) -> str:
    """
    Generate a concise, structured summary of the completed call.
    Uses the configured OpenAI model to analyze the transcript and caller data.
    """
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Format the transcript for the LLM
    transcript_text = "\n".join(
        [f"{'Caller' if t.get('role') == 'user' else 'Agent'}: {t.get('content', '')}" for t in transcript]
    )

    prompt = f"""
    ### CALL SUMMARY TASK
    Analyze the following transcript from a Soul Imaging radiology clinic call. 
    Provide a professional, clinical-style summary in 2-4 sentences.

    Include:
    1. Primary reason for the call (e.g., booking, inquiry, billing).
    2. Specific outcomes or actions taken by the agent.
    3. Any pending items or follow-up required from the clinic staff.

    Caller Context: {caller_data.model_dump_json() if caller_data else 'Anonymous'}

    Transcript:
    ---
    {transcript_text}
    ---

    Format: Single paragraph. Professional tone. No filler words.
    """

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=250,
        temperature=0.4,
    )

    summary = response.choices[0].message.content.strip()
    return summary
