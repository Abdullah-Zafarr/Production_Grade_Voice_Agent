import httpx
import os
from dotenv import load_dotenv

load_dotenv()

bucket_name = "recordings"
call_id = "40e77b5d-af53-4467-8c9e-4c48a5980f4d"
file_path = f"{call_id}.mp3"

headers = {
    "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
}

# 1. Upload dummy file
upload_res = httpx.post(
    f"{os.environ['SUPABASE_URL']}/storage/v1/object/{bucket_name}/{file_path}",
    headers=headers,
    content=b"dummy audio data",
)
print("Upload:", upload_res.text)

# 2. Update DB
payload = {
    "recording_url": f"s3://my-bucket/{file_path}",
    "recording_status": "completed",
    "recording_duration_seconds": 12.5
}
db_res = httpx.patch(
    f"{os.environ['SUPABASE_URL']}/rest/v1/call_logs?call_id=eq.{call_id}",
    headers={**headers, "Content-Type": "application/json"},
    json=payload
)
print("DB Update:", db_res.text)
