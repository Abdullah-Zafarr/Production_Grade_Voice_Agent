import os

directories = [
    "c:/Users/Hp/Desktop/Soul-Imaging-Agent-main/frontend/Soulbot_Updated/Admin/pages-content",
    "c:/Users/Hp/Desktop/Soul-Imaging-Agent-main/frontend/Soulbot_Updated/Admin/components"
]

target_str = 'const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");'
replacement = 'const API_URL = "";'

for directory in directories:
    for filename in os.listdir(directory):
        if filename.endswith(".tsx"):
            filepath = os.path.join(directory, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if target_str in content:
                content = content.replace(target_str, replacement)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {filename}")
