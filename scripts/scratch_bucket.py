import httpx
import os
from dotenv import load_dotenv

load_dotenv()

res = httpx.post(
    f"{os.environ['SUPABASE_URL']}/storage/v1/object/list/recordings",
    json={"prefix": ""},
    headers={
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}"
    }
)
try:
    print(res.json())
except Exception:
    print(res.text)
