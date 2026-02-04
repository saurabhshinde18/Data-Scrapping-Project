import json
from pathlib import Path
import soupsieve as sv
from t_platform.product.scrapers.base_scraper import BaseScraper

SELECTOR_PATH = Path("t_platform/product/selectors")

def load_selectors(platform: str) -> dict:
    file_path = SELECTOR_PATH / f"{platform}.json"
    if not file_path.exists():
        raise ValueError("Unsupported platform")

    selectors = json.loads(file_path.read_text())

    # Validate selectors
    for key, selector in selectors.items():
        if selector and not selector.startswith("script:"):
            try:
                sv.compile(selector)
            except Exception as e:
                raise ValueError(f"Invalid selector for {key}: {selector} - {str(e)}")

    return selectors

def scrape_product(platform: str, url: str):
    selectors = load_selectors(platform)
    scraper = BaseScraper(url, selectors)
    return scraper.scrape()
