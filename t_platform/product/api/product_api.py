from fastapi import APIRouter, HTTPException
from datetime import datetime
from pydantic import BaseModel

from t_platform.product.services.scraper_service import scrape_product, search_products
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


class SearchRequest(BaseModel):
    query: str
    platform: str
    country: str = "IN"
    limit: int = 9

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


@router.post("/search")
def search_by_name(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    platform = req.platform.lower().strip()
    platforms = ["amazon", "flipkart", "reliance"]
    if platform not in platforms:
        raise HTTPException(status_code=400, detail="Unsupported platform.")

    results = []
    items, cache_hit = search_products(
        platform, req.query, req.country, req.limit
    )
    for item in items:
        item["scraped_at"] = datetime.utcnow().isoformat()
    display_platform = (
        "Amazon" if platform == "amazon" else "Reliance" if platform == "reliance" else platform
    )
    results.append({"platform": display_platform, "items": items})

    return {
        "query": req.query,
        "country": req.country,
        "results": results,
        "cache_hit": cache_hit,
    }


@router.post("/search-debug")
def search_debug(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    platform = req.platform.lower().strip()
    platforms = ["amazon", "flipkart", "reliance"]
    if platform not in platforms:
        raise HTTPException(status_code=400, detail="Unsupported platform.")

    from t_platform.product.services.scraper_service import (
        _build_search_urls,
        _collect_links,
        _fetch_rendered_links,
    )
    from t_platform.product.scrapers.base_scraper import BaseScraper

    attempts = []
    try:
        for search_url in _build_search_urls(platform, req.query):
            if platform == "reliance":
                links = _fetch_rendered_links(search_url)[: req.limit]
            else:
                scraper = BaseScraper(search_url, {})
                soup = scraper.fetch()
                links = _collect_links(platform, soup, req.limit)
            attempts.append(
                {
                    "search_url": search_url,
                    "link_count": len(links),
                    "sample_links": links[:5],
                }
            )
            if links:
                break
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"platform": platform, "attempts": attempts}


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
