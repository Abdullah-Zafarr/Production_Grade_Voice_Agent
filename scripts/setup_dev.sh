#!/bin/bash
# Local development setup script for Soul Imaging Agent

echo "🚀 Setting up development environment..."

# 1. Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# 2. Setup environment variables
if [ ! -f .env ]; then
    echo "📄 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update your .env file with real API keys."
else
    echo "✅ .env file already exists."
fi

# 3. Create necessary directories
echo "📁 Ensuring knowledge base directories exist..."
mkdir -p agent/knowledge/data
mkdir -p agent/knowledge/docs

echo "✨ Setup complete! Run 'python -m agent.main dev' to start."
