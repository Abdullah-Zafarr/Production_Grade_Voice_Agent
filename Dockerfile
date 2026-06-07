# ── STAGE 1: Build the Admin Dashboard ──
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy Admin package files
COPY frontend/admin/package*.json ./
RUN npm install

# Copy Admin source
COPY frontend/admin/ ./

# Build-time environment variables for Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build:unix

# ── STAGE 2: Python Runtime ──
FROM python:3.12-slim
WORKDIR /home/agent

# Prevent Python from buffering
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally (as root)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY agent/ ./agent/

# Copy Frontend (Orb) logic
COPY frontend/widget/ ./frontend/widget/

# Copy Built Admin Dashboard from Stage 1
COPY --from=frontend-builder /app/dist ./frontend/admin/dist/

# Copy start script
COPY start.sh .
RUN chmod +x start.sh

# Create non-root user and set permissions
RUN adduser --disabled-password --gecos "" agent && \
    chown -R agent:agent /home/agent
USER agent

# Expose API port
EXPOSE 8080

ENTRYPOINT ["./start.sh"]
