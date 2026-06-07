# 🎙️ Soul Imaging AI Voice Agent - Project Report

**Date:** April 21, 2026  
**Status:** Successfully Deployed Locally & Unified

## 📋 Project Overview
The Soul Imaging AI Voice Agent is a production-grade system designed to automate radiology clinic reception. It combines ultra-low latency voice synthesis, intelligent RAG-based knowledge retrieval, and a premium administrative dashboard.

## 🏗️ System Architecture

### 1. Backend Orchestrator (LiveKit Worker)
- **Framework**: LiveKit Agents SDK v1.5
- **AI Brain**: OpenAI GPT-4o-mini
- **Transcription**: Gladia.io (Medical-grade STT)
- **Voice Synthesis**: Cartesia (Ultra-low latency TTS)
- **VAD**: Silero VAD (Precise speech detection)

### 2. API Server (FastAPI)
- **Unified Entry Point**: Serves as the token generator for LiveKit and the backend for the Admin Dashboard.
- **Static Hosting**: Configured to serve both the **AI Orb** and **Admin Dashboard** on a single port (8000).
- **Database**: Integrated with Supabase (PostgreSQL) for call logs, patient data, and clinic settings.

### 3. Frontend Interfaces
- **Admin Dashboard**: A React (Vite) + TailwindCSS application for monitoring calls, managing team members, and configuring agent prompts.
- **AI Orb**: A glassmorphism-inspired Vanilla JS/CSS interface that visualizes real-time audio frequencies and handles the voice connection.

## 🛠️ Local Implementation & Fixes
During the setup process, several critical improvements were made to ensure stability:

- **Unified Hosting**: Built the React Admin dashboard and configured FastAPI to serve it at `/admin` and the Orb at `/orb`. This eliminates CORS issues and simplifies navigation.
- **Dependency Optimization**: Resolved a critical Numpy crash on Windows (Python 3.14) by updating to version 2.4.4.
- **Connectivity Fixes**: Standardized all internal API calls to use relative paths or `localhost:8000`, ensuring "Back to Voice Agent" and "Admin" buttons work seamlessly.
- **UI Restoration**: Fixed missing shadcn/ui utility files (`lib/utils.ts`) that were preventing the Admin dashboard from compiling.

## 🚀 Access Information (Local)

| Component | URL |
| :--- | :--- |
| **Main Entry** | [http://localhost:8000](http://localhost:8000) |
| **Voice Agent (Orb)** | [http://localhost:8000/orb](http://localhost:8000/orb) |
| **Admin Dashboard** | [http://localhost:8000/admin](http://localhost:8000/admin) |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) |

### **Default Credentials**
- **Admin Email**: `admin@soulimaging.com`
- **Admin Password**: `admin123`

## ✅ Verification Results
- **Authentication**: Verified login process via Supabase/FastAPI.
- **Dashboard Metrics**: Confirmed real-time loading of call volume and booking conversion rates.
- **Voice Connection**: Verified the "Establish Secure Link" process and token generation for the Orb interface.
- **Cross-Navigation**: Successfully tested jumping between the Voice Agent and Admin Panel on the same origin.

---
*Built for Soul Imaging Radiology Clinic.*
