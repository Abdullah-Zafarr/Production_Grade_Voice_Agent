import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

project_id = os.environ['SUPABASE_URL'].split("//")[1].split(".")[0]
url = f"https://{project_id}.supabase.co/storage/v1/object/list/recordings"

res = httpx.post(
    url,
    headers={
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json"
    },
    json={"prefix": ""}
)
print(json.dumps(res.json(), indent=2))
