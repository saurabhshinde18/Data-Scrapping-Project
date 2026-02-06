import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote_plus, urljoin
import soupsieve as sv
from t_platform.product.scrapers.base_scraper import BaseScraper

SELECTOR_PATH = Path("t_platform/product/selectors")
SEARCH_BASE_URLS = {
    "amazon": ["https://www.amazon.in/s?k="],
    "flipkart": ["https://www.flipkart.com/search?q="],
    "reliance": [
        "https://www.reliancedigital.in/products?q=",
        "https://www.reliancedigital.in/products?q=%s&page_no=1&page_size=12&page_type=number",
        "https://www.reliancedigital.in/search?q=",
        "https://www.reliancedigital.in/search?query=",
        "https://www.reliancedigital.in/search?text=",
        "https://www.reliancedigital.in/search?searchText=",
    ],
}

CACHE_TTL_SECONDS = 600
_search_cache: dict[tuple, tuple[float, list[dict]]] = {}
SEARCH_DOMAINS = {
    "amazon": "https://www.amazon.in",
    "flipkart": "https://www.flipkart.com",
    "reliance": "https://www.reliancedigital.in",
}

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

def _fetch_rendered_links(url: str) -> list[str]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        raise RuntimeError(
            "Playwright is required for Reliance search. Install with: "
            "pip install playwright && playwright install chromium"
        ) from exc

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 768},
        )
        page = context.new_page()
        page.goto(url, wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(1500)
        links = page.evaluate(
            """() => {
                const anchors = Array.from(document.querySelectorAll("a"));
                const hrefs = anchors
                  .map(a => a.getAttribute("href") || a.getAttribute("data-href") || a.getAttribute("data-url"))
                  .filter(Boolean)
                  .filter(h => h.includes("/product/"));
                const absolute = hrefs.map(h => {
                  if (h.startsWith("http")) return h;
                  return "https://www.reliancedigital.in" + (h.startsWith("/") ? "" : "/") + h;
                });
                return Array.from(new Set(absolute));
            }"""
        )
        browser.close()
        return links

def _build_search_urls(platform: str, query: str) -> list[str]:
    bases = SEARCH_BASE_URLS.get(platform)
    if not bases:
        raise ValueError("Unsupported platform")
    urls = []
    encoded = quote_plus(query)
    for base in bases:
        if "%s" in base:
            urls.append(base % encoded)
        else:
            urls.append(f"{base}{encoded}")
    return urls


def _collect_links(platform: str, soup, limit: int) -> list[str]:
    links = []
    seen = set()

    if platform == "amazon":
        selectors = ["a.a-link-normal.s-no-outline", "h2 a.a-link-normal"]
        for anchor in soup.select(", ".join(selectors)):
            href = anchor.get("href")
            if not href:
                continue
            if "/dp/" not in href and "/gp/" not in href:
                continue
            url = urljoin(SEARCH_DOMAINS[platform], href)
            if url in seen:
                continue
            seen.add(url)
            links.append(url)
            if len(links) >= limit:
                break
    elif platform == "flipkart":
        selectors = ["a._1fQZEK", "a._2rpwqI", "a.IRpwTa", "a.s1Q9rs"]
        for anchor in soup.select(", ".join(selectors)):
            href = anchor.get("href")
            if not href:
                continue
            if "/p/" not in href and "pid=" not in href:
                continue
            url = urljoin(SEARCH_DOMAINS[platform], href)
            if url in seen:
                continue
            seen.add(url)
            links.append(url)
            if len(links) >= limit:
                break
    elif platform == "reliance":
        selectors = [
            "a.product-card-container",
            "a.product-card__link",
            "a.pdp__hoverTrigger",
            "a[href*='/product/']",
        ]
        for anchor in soup.select(", ".join(selectors)):
            href = anchor.get("href")
            if not href:
                continue
            if "/product/" not in href:
                continue
            url = urljoin(SEARCH_DOMAINS[platform], href)
            if url in seen:
                continue
            seen.add(url)
            links.append(url)
            if len(links) >= limit:
                break
        if len(links) < limit:
            for element in soup.select("[data-href], [data-url]"):
                href = element.get("data-href") or element.get("data-url")
                if not href:
                    continue
                if "/product/" not in href:
                    continue
                url = urljoin(SEARCH_DOMAINS[platform], href)
                if url in seen:
                    continue
                seen.add(url)
                links.append(url)
                if len(links) >= limit:
                    break
    else:
        raise ValueError("Unsupported platform")

    if not links:
        for anchor in soup.find_all("a", href=True):
            href = anchor.get("href")
            if not href:
                continue
            if platform == "amazon":
                if "/dp/" not in href and "/gp/" not in href:
                    continue
            elif platform == "flipkart":
                if "/p/" not in href and "pid=" not in href and "/item/" not in href:
                    continue
                if "search?" in href:
                    continue
            elif platform == "reliance":
                if "/product/" not in href:
                    continue
            url = urljoin(SEARCH_DOMAINS[platform], href)
            if url in seen:
                continue
            seen.add(url)
            links.append(url)
            if len(links) >= limit:
                break

    if not links:
        html = str(soup)
        if platform == "flipkart":
            matches = re.findall(r'href="([^"]*/p/[^"]+)"', html)
        elif platform == "reliance":
            matches = re.findall(r'href="([^"]*/product/[^"]+)"', html)
            matches += re.findall(r'"url":"([^"]*/product/[^"]+)"', html)
        else:
            matches = []
        for href in matches:
            url = urljoin(SEARCH_DOMAINS[platform], href)
            if url in seen:
                continue
            seen.add(url)
            links.append(url)
            if len(links) >= limit:
                break

    return links


def search_products(
    platform: str, query: str, country: str = "IN", limit: int = 9
) -> tuple[list[dict], bool]:
    cache_key = (platform, query.lower().strip(), country, limit)
    cached = _search_cache.get(cache_key)
    if cached:
        cached_at, cached_results = cached
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return cached_results, True

    search_urls = _build_search_urls(platform, query)
    soup = None
    links = []
    for search_url in search_urls:
        try:
            if platform == "reliance":
                links = _fetch_rendered_links(search_url)[:limit]
            else:
                scraper = BaseScraper(search_url, {})
                soup = scraper.fetch()
                links = _collect_links(platform, soup, limit)
        except Exception:
            continue
        if links:
            break

    display_platform = (
        "Amazon" if platform == "amazon" else "Reliance" if platform == "reliance" else platform
    )

    def _scrape_one(url: str):
        product = scrape_product(platform, url)
        return {
            "platform": display_platform,
            "country": country,
            "source_url": url,
            "product": product,
        }

    results = []
    if not links:
        return results, False

    max_workers = min(10, len(links))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {executor.submit(_scrape_one, url): url for url in links}
        for future in as_completed(future_map):
            try:
                results.append(future.result())
            except Exception:
                continue

    if platform == "reliance":
        tokens = [t for t in query.lower().split() if t]
        if tokens:
            filtered = [
                item
                for item in results
                if all(t in str(item.get("product", {}).get("title", "")).lower() for t in tokens)
            ]
            if filtered:
                results = filtered[:limit]

    _search_cache[cache_key] = (time.time(), results)
    return results, False
