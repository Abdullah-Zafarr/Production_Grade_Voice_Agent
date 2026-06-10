import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")

cmd = [
    'fly', 'deploy',
    '--build-arg', f'VITE_SUPABASE_URL={supabase_url}',
    '--build-arg', f'VITE_SUPABASE_ANON_KEY={supabase_anon_key}'
]

subprocess.run(cmd, check=True)
