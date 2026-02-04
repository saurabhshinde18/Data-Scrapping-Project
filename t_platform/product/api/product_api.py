from fastapi import APIRouter, HTTPException
from datetime import datetime
from pydantic import BaseModel

from t_platform.product.services.scraper_service import scrape_product
from t_platform.product.utils.file_writer import save_to_file

router = APIRouter()

# ✅ Request schema (no query params)
class ScrapeRequest(BaseModel):
    url: str
    platform: str
    country: str = "IN"

@router.post("/scrape")
def scrape(req: ScrapeRequest):
    try:
        product = scrape_product(req.platform.lower(), req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    response = {
        "platform": req.platform,
        "country": req.country,
        "source_url": req.url,
        "product": product,
        "scraped_at": datetime.utcnow().isoformat()
    }

    save_to_file(req.platform, req.country, req.url, response)
    return response
