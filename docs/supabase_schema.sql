-- ═══════════════════════════════════════════════════════════════
-- Soul Imaging Voice Agent — Supabase Schema
-- Safe to run multiple times (all statements are idempotent).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. call_logs — Full record of every call ──
CREATE TABLE IF NOT EXISTS call_logs (
    call_id          UUID PRIMARY KEY,
    room_name        TEXT NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL,
    ended_at         TIMESTAMPTZ,
    duration_seconds FLOAT,
    outcome          TEXT DEFAULT 'other',
    summary          TEXT,
    transcript       JSONB DEFAULT '[]',
    booking          JSONB,
    caller_data      JSONB DEFAULT '{}',
    recording_url    TEXT,
    recording_status TEXT DEFAULT 'none',
    recording_duration_seconds FLOAT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. callers — Quick lookup for individual callers ──
CREATE TABLE IF NOT EXISTS callers (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT,
    phone        TEXT,
    email        TEXT,
    inquiry_type TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for fast dashboard queries ──
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome    ON call_logs (outcome);
CREATE INDEX IF NOT EXISTS idx_callers_email        ON callers (email);

-- ── 3. clinic_settings — Dynamic agent configuration ──
CREATE TABLE IF NOT EXISTS clinic_settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. team_members — Staff management ──
CREATE TABLE IF NOT EXISTS team_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    role       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT,
    status     TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Default Settings ──
INSERT INTO clinic_settings (key, value)
VALUES 
('agent_identity', '{
    "name": "Sarah",
    "voice_id": "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    "speed": 1.0,
    "tone": "professional"
}'),
('agent_prompt', '{
    "instructions": "You are a professional medical receptionist for Soul Imaging clinic. Be warm, helpful, and efficient. Always confirm appointment details before booking.",
    "greeting": "Hello, thank you for calling Soul Imaging. How can I help you today?",
    "closing": "Thank you for calling Soul Imaging. Have a wonderful day!"
}')
ON CONFLICT (key) DO NOTHING;

-- ── Default Team ──
INSERT INTO team_members (name, role, email, password)
VALUES ('Admin User', 'Administrator', 'admin@soulimaging.com', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- 1. Add the password column
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Set the default admin password
UPDATE team_members SET password = 'admin123' WHERE email = 'admin@soulimaging.com';
