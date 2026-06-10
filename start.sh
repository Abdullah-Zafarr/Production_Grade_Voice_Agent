#!/bin/bash
set -e

echo "🚀 Starting Soul Imaging Unified Backend..."

# 1. Start the FastAPI Token & Admin Server
# We run this on port 8080 (Fly.io default) in the background
echo "📡 Starting API Server on port 8080..."
python -m uvicorn agent.api:app --host 0.0.0.0 --port 8080 &

# 2. Wait a moment for API to initialize
sleep 2

# 3. Start the LiveKit Agent Worker
# This stays in the foreground so the container doesn't exit
echo "🤖 Starting LiveKit Agent Worker..."
python -m agent.main start
