import json
import hashlib
from pathlib import Path
from datetime import datetime

BASE_PATH = Path("t_platform/product/storage/product")
PRODUCTS_FILE = Path("t_platform/product/storage/products.json")
SEARCH_BASE_PATH = Path("t_platform/product/storage/search")

def save_to_file(platform: str, country: str, url: str, data: dict):
    date = datetime.utcnow().strftime("%Y-%m-%d")
    product_id = hashlib.md5(url.encode()).hexdigest()

    path = BASE_PATH / platform / country / date
    path.mkdir(parents=True, exist_ok=True)

    file_path = path / f"{product_id}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    return str(file_path)


def save_search_results(platform: str, country: str, query: str, data: dict):
    date = datetime.utcnow().strftime("%Y-%m-%d")
    query_hash = hashlib.md5(query.encode()).hexdigest()
    timestamp = datetime.utcnow().strftime("%H%M%S")

    path = SEARCH_BASE_PATH / platform / country / date
    path.mkdir(parents=True, exist_ok=True)

    file_path = path / f"{query_hash}_{timestamp}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    return str(file_path)


def load_products():
    if not PRODUCTS_FILE.exists():
        return load_products_from_storage()
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list) and data:
            return data
        return load_products_from_storage()
    except (json.JSONDecodeError, OSError):
        return load_products_from_storage()


def load_products_from_storage():
    products = []
    if not BASE_PATH.exists():
        return products
    for platform_dir in BASE_PATH.iterdir():
        if not platform_dir.is_dir():
            continue
        for country_dir in platform_dir.iterdir():
            if not country_dir.is_dir():
                continue
            for date_dir in country_dir.iterdir():
                if not date_dir.is_dir():
                    continue
                for file_path in date_dir.glob("*.json"):
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            item = json.load(f)
                        if isinstance(item, dict):
                            products.append(item)
                    except (json.JSONDecodeError, OSError):
                        continue
    products.sort(key=lambda x: x.get("scraped_at", ""), reverse=True)
    return products


def list_storage_files():
    files = []
    if not BASE_PATH.exists():
        return files
    for file_path in BASE_PATH.rglob("*.json"):
        try:
            relative = file_path.relative_to(BASE_PATH).as_posix()
            files.append(relative)
        except ValueError:
            continue
    return files


def read_storage_file(relative_path: str):
    if not relative_path:
        return None
    safe_path = Path(relative_path)
    if safe_path.is_absolute() or ".." in safe_path.parts:
        return None
    file_path = BASE_PATH / safe_path
    if not file_path.exists() or not file_path.is_file():
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def append_product(data: dict):
    products = load_products()
    # Avoid duplicates by source_url if present
    source_url = data.get("source_url")
    if source_url:
        products = [p for p in products if p.get("source_url") != source_url]
    products.insert(0, data)
    PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=4)
    return str(PRODUCTS_FILE)


def _product_hash(url: str):
    return hashlib.md5(url.encode()).hexdigest()


def _date_from_scraped_at(scraped_at: str):
    if not scraped_at:
        return None
    try:
        return scraped_at.split("T")[0]
    except Exception:
        return None


def remove_product(source_url: str, platform: str = None, country: str = None, scraped_at: str = None):
    if not source_url:
        return False

    # Remove from products.json
    products = load_products()
    updated = [p for p in products if p.get("source_url") != source_url]
    PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(updated, f, indent=4)

    # Remove the exact storage file if possible
    product_id = _product_hash(source_url)
    date = _date_from_scraped_at(scraped_at)
    deleted_file = False

    if platform and country and date:
        file_path = BASE_PATH / platform / country / date / f"{product_id}.json"
        if file_path.exists():
            file_path.unlink()
            deleted_file = True

    # Fallback: search all dates for the hash under platform/country (or all)
    # Also remove any other duplicates that match the same hash
    search_roots = []
    if platform and country:
        search_roots = [BASE_PATH / platform / country]
    elif platform:
        search_roots = [BASE_PATH / platform]
    else:
        search_roots = [BASE_PATH]

    for root in search_roots:
        if not root.exists():
            continue
        for file_path in root.rglob(f"{product_id}.json"):
            try:
                file_path.unlink()
                deleted_file = True
            except OSError:
                continue

    return True


def get_available_countries():
    if not BASE_PATH.exists():
        return ["IN"]
    countries = set()
    for platform_dir in BASE_PATH.iterdir():
        if not platform_dir.is_dir():
            continue
        for country_dir in platform_dir.iterdir():
            if country_dir.is_dir():
                countries.add(country_dir.name)
    return sorted(countries) if countries else ["IN"]
