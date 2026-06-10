import httpx
import os
from dotenv import load_dotenv

load_dotenv()

res = httpx.post(
    f"{os.environ['SUPABASE_URL']}/rest/v1/team_members",
    json={
        "email": "test@soulimaging.com", 
        "password": "testpassword", 
        "name": "Test User", 
        "role": "Admin", 
        "status": "Active"
    },
    headers={
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Prefer": "resolution=merge-duplicates"
    }
)
print(res.status_code, res.text)
