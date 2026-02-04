import json
from pathlib import Path
from datetime import datetime, timedelta

from t_platform.product.services.scraper_service import scrape_product
from t_platform.product.utils.file_writer import save_to_file

CONFIG_PATH = Path("t_platform/product/config/products.json")

def load_config():
    return json.loads(CONFIG_PATH.read_text())

def save_config(config):
    CONFIG_PATH.write_text(json.dumps(config, indent=4))

def should_fetch(product):
    if not product.get("enabled", False):
        return False

    last = product.get("last_fetched_at")
    refresh = product.get("refresh_minutes", 60)

    if last is None:
        return True

    last_time = datetime.fromisoformat(last)
    return datetime.utcnow() >= last_time + timedelta(minutes=refresh)

def run_cron():
    print("⏰ Cron tick")

    config = load_config()
    updated = False

    for product in config["products"]:
        if not should_fetch(product):
            continue

        try:
            data = scrape_product(product["platform"], product["url"])

            response = {
                "platform": product["platform"],
                "country": product["country"],
                "source_url": product["url"],
                "product": data,
                "scraped_at": datetime.now().isoformat()
            }

            save_to_file(
                product["platform"],
                product["country"],
                product["url"],
                response
            )

            product["last_fetched_at"] = datetime.utcnow().isoformat()
            updated = True
            product_id = product.get("id", f"{product['platform']}-{product['url'][-6:]}")
            
            print(f"✅ Updated {product_id}")

        except Exception as e:
           product_id = product.get("id", product.get("platform", "unknown"))
           print(f"❌ Failed {product_id}: {e}")


    if updated:
        save_config(config)

if __name__ == "__main__":
    run_cron()
