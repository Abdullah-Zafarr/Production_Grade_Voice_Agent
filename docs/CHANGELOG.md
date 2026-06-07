## Version 1.3.0 – 2026-04-19
 
### 1. Summary (Lead: Abdullah)
* This version marks the final production-ready milestone, focusing on enterprise-grade security hardening and operational reliability.
* Critical fixes were applied to the scheduling pipeline to ensure perfect synchronization between the agent's spoken time and the clinic's local timezone.
 
### 2. Changes Made
 
#### Security Hardening
* **Password Hashing:** Implemented **bcrypt** for all database password comparisons and the admin fallback, eliminating the risk of plaintext credential exposure.
* **Backdoor Removal:** Replaced the hardcoded admin fallback with an environment-variable-driven system (`ADMIN_FALLBACK_EMAIL` and `ADMIN_PASSWORD_HASH`), fully decoupling sensitive credentials from the source code.
* **Clean Handoff:** Deleted internal `code_fixes` logs and PRD summaries to prevent exposing proprietary logic or security audit results.
 
#### Reliability & Conversational Flow
* **Shutdown Lifecycle Fix:** Corrected the registration order for the `on_shutdown` callback in `agent/main.py`. Transcripts and call outcomes are now reliably saved to Supabase even if the call ends abruptly.
* **Local Time Sync:** Fixed a bug where the agent would speak appointment confirmations in UTC. The agent now uses `_format_display_time` to confirm bookings in the clinic's local timezone (e.g., "10:30 AM" instead of "00:30").
* **DST-Aware Analytics:** Switched analytics timezone logic from a hardcoded `+10` offset to a dynamic **zoneinfo-based** calculation, ensuring dashboard accuracy during Daylight Saving Time.
 
#### Optimization & Refactoring
* **VAD Resource Re-use:** Eliminated model redundancy by retrieving the pre-warmed VAD model from worker memory instead of reloading it for every individual call.
* **Resource Cleanup:** Added a FastAPI shutdown event to gracefully close the shared `httpx.AsyncClient`, preventing connection leaks.
* **Documentation Reorganization:** Moved all secondary markdown files and screenshot assets into a dedicated `docs/` folder to clean up the root repository.
* **Code Polish:** Eliminated bare `except:` clauses and implemented a more robust model allowlist in `agent/voice_pipeline.py`.
 
---
 
## Version 1.2.1 – 2026-04-17

### 1. Summary (Moosa)
* **Fixed Cal.com Scheduling Hallucinations:** Prevented the agent from offering random out-of-hours booking slots to callers.
* **Implemented Working Hours:** Added logic to actively filter incoming Cal.com slots against the clinic's database-configured hours (Mon–Fri 9AM to 5PM).
* **Enforced Buffer Times:** Integrated notice period and buffer time calculations directly into the code so users cannot book immediate/conflicting slots.
* **Resolved Timezone Issues:** Removed hardcoded UTC timestamps and properly passed the clinic's local timezone into the availability check.

---

## Version 1.2.0 – 2026-04-17
 
### 1. Summary (Lead: Abdullah)
 
* This update restores industry-leading voice quality by reverting to Gladia and Cartesia while introducing critical stability fixes for conversational flow.
* A major branding overhaul was completed, ensuring the real Soul Imaging identity is consistent across all interfaces with a premium dark-mode aesthetic.
 
### 2. Changes Made
 
#### Voice & Conversational Intelligence
* **Engine Restoration:** Reverted STT and TTS engines to **Gladia** and **Cartesia** for superior latency and expressive reach.
* **Language Stability:** Hard-locked Gladia STT to English only (`languages=["en"]`) and disabled `code_switching` to eliminate hallucinations and random switches to foreign languages.
* **Conversational Pace Tuning:** 
    * **Intentional Latency:** Increased endpointing delay by **0.5s** (now set to 0.5s - 1.0s range). This target delay is based on industry standards for professional agents to prevent interrupting users mid-sentence.
    * **VAD Optimization:** Updated Silero VAD `min_silence_duration` to 400ms to ignore natural speech gaps, providing a more human-like listening experience.
 
#### Branding & Architecture
* **Directory Cleanup:** Renamed `Production_Grade_VoiceAgent_FrontEnd` to `frontend` for better project structure and updated all path references in `agent/api.py` and `Dockerfile`.
* **Professional Branding:** 
    * Replaced all placeholder logos with the official Soul Imaging teal logo.
    * Implemented `?v=3` cache-busting to bypass browser caching of old assets.
* **Login Redesign:** Overhauled the Admin Login page from a generic light theme to a premium **Deep Midnight** blue theme with glassmorphism and enhanced focus states.
* **Session Controls:** Added a dedicated Logout dropdown to the administrator avatar in the header to allow secure session termination.
* **Environment Cleanup:** Deleted the redundant `.venv_old` directory to reduce project size.
 
### 3. End Result
* The agent now feels sophisticated and polite, waiting for the caller to finish their thoughts before responding.
* The administrative interface is now fully synchronized with the clinic's brand identity.
 
---
 
## Version 1.1.0 – 2026-04-16
 
### 1. Summary (Saif)
* Initial stability pass focused on UI navigation and frontend context warnings for SSL.
 
### 2. Key Changes
* **Navigation:** Added Admin dashboard access to the main UI.
* **Security:** Added HTTPS microphone context detection warnings.
* **Performance:** Optimized startup sequence with parallel token fetching.
