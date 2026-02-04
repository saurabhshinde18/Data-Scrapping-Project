import json
import hashlib
from pathlib import Path
from datetime import datetime

BASE_PATH = Path("t_platform/product/storage/product")

def save_to_file(platform: str, country: str, url: str, data: dict):
    date = datetime.utcnow().strftime("%Y-%m-%d")
    product_id = hashlib.md5(url.encode()).hexdigest()

    path = BASE_PATH / platform / country / date
    path.mkdir(parents=True, exist_ok=True)

    file_path = path / f"{product_id}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    return str(file_path)
