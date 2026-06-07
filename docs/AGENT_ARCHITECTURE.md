# Soul Imaging Voice Agent | Architecture & Technical Guide

Welcome to the **Soul Imaging AI Voice Agent** project. This document provides a comprehensive map of the project's technical stack, folder structure, and core architectural principles to ensure seamless development and maintenance.

---

## 🛠 Tech Stack

### 🚀 Backend & AI Pipeline
- **Core Orchestration**: [LiveKit Agents SDK v1.5+](https://docs.livekit.io/agents/) (Python)
- **STT (Speech-to-Text)**: [Gladia.io](https://gladia.io) — Ultra-low latency enterprise transcription.
- **LLM (Brain)**: OpenAI `GPT-4o-mini` — Optimized for speed and reasoning.
- **TTS (Text-to-Speech)**: [Cartesia](https://cartesia.ai) — High-fidelity, low-latency synthetic voice.
- **VAD (Voice Activity Detection)**: [Silero VAD](https://github.com/snakers4/silero-vad) — Efficient speech detection.
- **API Framework**: FastAPI (Python) with Uvicorn.

### 📊 Data & Integrations
- **Database**: [Supabase](https://supabase.com) (PostgreSQL) — Stores call logs, patient data, and clinic settings.
- **Scheduling**: [Cal.com](https://cal.com) — Used for real-time appointment checks and bookings.
- **Knowledge Base**: Custom RAG (Retrieval Augmented Generation) using ChromaDB-style local vector stores with OpenAI embeddings.

### 🎨 Frontend
- **Voice Agent Orb**: Vanilla JavaScript & CSS (Custom Glassmorphism & Audio Visualizer).
- **Admin Dashboard**: React (Vite) + TailwindCSS for clinic management.

---

## 📂 Project Structure

```text
Production_Grade_Voice_Agent/
├── agent/                      # Core Voice Agent Logic (Python)
│   ├── call/                   # Call Lifecycle & State Machine
│   │   ├── lifecycle.py        # Per-call state tracker (Supabase sync)
│   │   └── models.py           # Pydantic data models for call records
│   ├── tools/                  # LLM-Callable Tools (Function Calling)
│   │   ├── calendar_tool.py    # Appointment booking via Cal.com
│   │   ├── data_collection.py  # Mid-call patient data persistence
│   │   └── knowledge_tool.py   # RAG querying tool
│   ├── knowledge/               # RAG Pipeline
│   │   ├── docs/               # Source knowledge (.md, .txt)
│   │   ├── loader.py           # Text chunking and ingestion
│   │   └── store.py            # Vector database interface
│   ├── main.py                 # LiveKit Worker Entrypoint (Start here!)
│   ├── voice_pipeline.py       # Plugin Factory (STT/LLM/TTS setup)
│   └── config.py               # Environment & Setting management
├── Production_Grade_VoiceAgent_FrontEnd/
│   ├── Admin/                  # React Admin Dashboard (Port 8080)
│   └── Soulbot_Updated/
│       └── Frontend/           # Patient-facing Voice UI (Port 8000/orb)
│           ├── index.html      # Main layout
│           ├── script.js       # LiveKit client integration
│           └── Orb/            # 3D/CSS Visualizer components
├── server.py                   # FastAPI Backend (Token Gen & Config API)
└── .env                        # Confidential keys (LiveKit, OpenAI, etc.)
```

---

## 🧠 Intellectual Architecture

### 1. Concurrency Safety (The "Flawless" Pattern)
Unlike many prototype agents, this project uses a **Local Context** pattern. 
- **The Problem**: Global variables in tools can lead to "Data Leakage" where Call A's data is saved to Call B's record.
- **The Solution**: All tools are defined within a `llm.FunctionContext` class that is instantiated **uniquely for every call**. This ensures that the `lifecycle_manager` of one call is physically inaccessible to another.

### 2. The Voice Pipeline
We use the high-level `voice.Agent` orchestration. This handles:
- **Interruption Handling**: Stops TTS immediately when the user speaks.
- **Transcriptions**: Natively pushes STT results to the room participants.
- **Turn Detection**: Manages the silence gap before the AI decides to reply.

### 3. RAG Flow
Knowledge is stored as Markdown in `agent/knowledge/docs/`. During the `prewarm` phase of the worker, these files are read, chunked, and embedded into a local vector store. The agent uses the `search_knowledge_base` tool to retrieve these facts before answering health/policy questions.

---

## 🛠 Running Locally

1. **Start Backend**: `python server.py` (Default: Port 8000)
2. **Start Agent**: `python -m agent.main start` (Worker)
3. **Start Admin**: `cd .../Admin && npm run dev` (Default: Port 8080)

---

## 📝 Developer Notes
- **To add a tool**: Create a method in the relevant class in `agent/tools/`, decorate it with `@llm.ai_callable`, and ensure it's added to the `Context` in `agent/tools/__init__.py`.
- **To update AI personality**: Modify the system prompt in `agent/prompt.py` or use the Admin panel to update settings in Supabase.
