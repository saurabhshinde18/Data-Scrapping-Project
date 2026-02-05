from fastapi import APIRouter, HTTPException
from datetime import datetime
from pydantic import BaseModel

from t_platform.product.services.scraper_service import scrape_product
from t_platform.product.utils.file_writer import (
    save_to_file,
    append_product,
    load_products,
    remove_product,
    get_available_countries,
    list_storage_files,
    read_storage_file,
)

router = APIRouter()

# ✅ Request schema (no query params)
class ScrapeRequest(BaseModel):
    url: str
    platform: str
    country: str = "IN"


class DeleteRequest(BaseModel):
    source_url: str
    platform: str | None = None
    country: str | None = None
    scraped_at: str | None = None


class FileRequest(BaseModel):
    path: str

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
    append_product(response)
    return response


@router.get("/list")
def list_products():
    return load_products()


@router.post("/delete")
def delete_product(req: DeleteRequest):
    removed = remove_product(
        req.source_url, req.platform, req.country, req.scraped_at
    )
    if not removed:
        raise HTTPException(status_code=400, detail="Source URL is required.")
    return {"status": "ok"}


@router.get("/countries")
def list_countries():
    return get_available_countries()


@router.get("/files")
def list_files():
    return list_storage_files()


@router.post("/file")
def read_file(req: FileRequest):
    data = read_storage_file(req.path)
    if data is None:
        raise HTTPException(status_code=404, detail="File not found.")
    return data
