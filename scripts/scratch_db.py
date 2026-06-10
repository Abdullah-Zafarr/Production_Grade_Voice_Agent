import httpx
import os
from dotenv import load_dotenv
load_dotenv()
res = httpx.get(
    os.environ['SUPABASE_URL'] + '/rest/v1/call_logs?select=call_id,recording_status,recording_url&order=started_at.desc&limit=5',
    headers={'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}"}
)
for row in res.json():
    print(f"ID: {row.get('call_id')}, Status: {row.get('recording_status')}, URL: {row.get('recording_url')}")
