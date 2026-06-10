import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

keys = [
    'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_WEBHOOK_KEY',
    'OPENAI_API_KEY', 'OPENAI_MODEL', 'GLADIA_API_KEY', 'CARTESIA_API_KEY',
    'CARTESIA_VOICE_ID', 'CALCOM_API_KEY', 'CALCOM_EVENT_TYPE_ID', 'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_FALLBACK_EMAIL',
    'ADMIN_PASSWORD_HASH', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_REGION',
    'S3_BUCKET', 'S3_ENDPOINT'
]

env_vars = []
for k in keys:
    v = os.getenv(k)
    if v:
        env_vars.append(f'{k}={v}')

if env_vars:
    cmd = ['fly', 'secrets', 'set'] + env_vars
    subprocess.run(cmd, check=True)
else:
    print("No env vars found to set.")
