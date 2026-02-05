import requests
import json
import re
from bs4 import BeautifulSoup
import soupsieve as sv

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}

class BaseScraper:
    def __init__(self, url: str, selectors: dict):
        self.url = url
        self.selectors = selectors
        self.platform = self._detect_platform()
        self.compiled_selectors = {}
        for key, selector in selectors.items():
            if selector and not selector.startswith("script:") and not selector.startswith("jsonld:"):
                try:
                    self.compiled_selectors[key] = sv.compile(selector)
                except:
                    self.compiled_selectors[key] = None
            else:
                self.compiled_selectors[key] = selector

    def _detect_platform(self):
        url_lower = self.url.lower()
        if 'amazon' in url_lower or 'amzn' in url_lower:
            return 'amazon'
        elif 'flipkart' in url_lower:
            return 'flipkart'
        elif 'reliance' in url_lower or 'jio' in url_lower:
            return 'reliance'
        return 'unknown'

    def fetch(self):
        import gzip
        from bs4 import BeautifulSoup
        
        session = requests.Session()
        
        # Platform-specific headers
        headers = HEADERS.copy()
        
        if self.platform == 'flipkart':
            # Special handling for Flipkart - add more realistic headers
            headers["Referer"] = "https://www.flipkart.com/"
            headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3"
            headers["Accept-Language"] = "en-IN,en;q=0.9,en-US;q=0.8,hi;q=0.7"
            headers["Accept-Encoding"] = "gzip, deflate"
            headers["Cache-Control"] = "no-cache"
            headers["Pragma"] = "no-cache"
            # Add DNT header to appear more like a real browser
            headers["DNT"] = "1"
        elif self.platform == 'amazon':
            # Special handling for Amazon
            headers["Referer"] = "https://www.amazon.in/"
            headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        
        # Try to get the page with retries
        for attempt in range(3):
            try:
                response = session.get(self.url, headers=headers, timeout=15, allow_redirects=True)
                
                # Check for common blocking indicators
                if response.status_code in [403, 429, 503]:
                    if self.platform == 'amazon':
                        raise ValueError("Site is showing CAPTCHA or blocking requests. Amazon may require additional anti-bot measures.")
                    else:
                        # Try with different headers
                        alt_headers = headers.copy()
                        alt_headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                        response = session.get(self.url, headers=alt_headers, timeout=15, allow_redirects=True)
                
                response.raise_for_status()
                
                # Properly handle compressed content
                content = response.content
                
                # Check content encoding
                content_encoding = response.headers.get('content-encoding', '').lower()
                
                if 'gzip' in content_encoding:  # Gzip compression
                    try:
                        content = gzip.decompress(content)
                    except:
                        # If it's not actually gzipped, use the original content
                        pass
                
                # Convert to text
                try:
                    text_content = content.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        text_content = content.decode('latin-1')
                    except:
                        text_content = content.decode('utf-8', errors='ignore')
                
                soup = BeautifulSoup(text_content, "html.parser")
                
                # Check if the page is actually a product page for Flipkart
                if self.platform == 'flipkart':
                    # Look for signs that this is not a product page but a generic page
                    title = soup.find('title')
                    if title:
                        title_text = title.get_text().lower()
                        # If it's a generic homepage, this might indicate bot detection
                        if 'online shopping' in title_text and 'india' in title_text and 'mobile' in title_text:
                            if attempt < 2:  # If not the last attempt, try with more sophisticated headers
                                # Add more realistic session-like behavior
                                session.cookies.set('REQUEST_METHOD', 'GET', domain='.flipkart.com')
                                alt_headers = headers.copy()
                                alt_headers["Upgrade-Insecure-Requests"] = "1"
                                response = session.get(self.url, headers=alt_headers, timeout=15, allow_redirects=True)
                                content = response.content
                                if 'gzip' in response.headers.get('content-encoding', '').lower():
                                    try:
                                        content = gzip.decompress(content)
                                    except:
                                        # If it's not actually gzipped, use the original content
                                        pass
                                
                                try:
                                    text_content = content.decode('utf-8')
                                except UnicodeDecodeError:
                                    text_content = content.decode('latin-1', errors='ignore')
                                
                                soup = BeautifulSoup(text_content, "html.parser")
                
                return soup
                
            except requests.exceptions.HTTPError as e:
                # For Flipkart 500 errors, which often indicate bot detection, handle specially
                if hasattr(response, 'status_code') and response.status_code == 500 and self.platform == 'flipkart':
                    if attempt < 2:  # Not the last attempt
                        # Wait and try again with different approach
                        import time
                        time.sleep(3)
                        continue
                    else:
                        # On final attempt, return a special response indicating bot protection
                        return BeautifulSoup("<html><body><div class='bot-protection'>Bot protection active</div></body></html>", "html.parser")
                elif attempt == 2:  # Last attempt for other errors
                    raise e
            except Exception as e:
                if attempt == 2:  # Last attempt
                    raise e
                # Wait before retry
                import time
                time.sleep(2)
        
        # This shouldn't be reached, but just in case
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def extract_jsonld(self, soup):
        """Extract product data from JSON-LD schema"""
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                if not script.string:
                    continue
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get('@type') == 'Product':
                    return data
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') == 'Product':
                            return item
            except (json.JSONDecodeError, TypeError):
                continue
        return None

    def _clean_price(self, text):
        """Clean price string by removing currency symbols"""
        if not text:
            return None
        cleaned = str(text).replace("₹", "").replace("â¹", "").replace("$", "").replace(",", "").strip()
        return cleaned

    
    def _parse_number(self, value):
        if value is None:
            return None
        cleaned = re.sub(r"[^0-9.]", "", str(value))
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _compute_discount_percent(self, price, original_price):
        price_num = self._parse_number(price)
        original_num = self._parse_number(original_price)
        if price_num is None or original_num is None:
            return None
        if original_num <= 0 or price_num < 0 or price_num > original_num:
            return None
        percent = round(((original_num - price_num) / original_num) * 100)
        if percent <= 0:
            return None
        return int(percent)

    def _normalize_discount(self, discount, price, original_price):
        if discount is None:
            discount_text = ""
        else:
            discount_text = str(discount).strip()

        computed = self._compute_discount_percent(price, original_price)

        if not discount_text:
            return f"{computed}% off" if computed is not None else None

        lowered = discount_text.lower()
        if any(key in lowered for key in ["bot", "blocked", "protection", "site"]):
            return discount

        if "%" in discount_text or "off" in lowered:
            return discount_text

        if computed is not None:
            return f"{computed}% off"

        if re.fullmatch(r"\d+(\.\d+)?", discount_text):
            return f"{discount_text}% off"

        if len(discount_text) < 2:
            return None

        return discount_text

    def extract(self, soup, selector, field_name=None):
        if not selector:
            return None
        if selector.startswith("script:"):
            return self.extract_from_script(soup, selector)
        if selector.startswith("jsonld:"):
            return None
        
        # Handle multiple selectors separated by commas
        if ',' in selector:
            selectors = [s.strip() for s in selector.split(',')]
            for sel in selectors:
                result = self._extract_single_selector(soup, sel, field_name)
                if result:
                    return result
            return None
        else:
            return self._extract_single_selector(soup, selector, field_name)

    def _extract_single_selector(self, soup, selector, field_name=None):
        # Try compiled selector first
        compiled = self.compiled_selectors.get(selector)
        element = None
        if compiled and compiled is not None:
            try:
                element = sv.select_one(compiled, soup)
            except:
                element = None
        
        # Fallback to direct CSS selection
        if not element:
            try:
                element = soup.select_one(selector)
            except:
                pass
        
        if element:
            text = element.get_text(strip=True)
            if field_name in ['price', 'original_price']:
                return self._clean_price(text)
            return text
        return None

    def extract_list(self, soup, selector):
        if not selector:
            return []
        if selector.startswith("script:"):
            return self.extract_list_from_script(soup, selector)
        
        # Handle multiple selectors separated by commas
        if ',' in selector:
            selectors = [s.strip() for s in selector.split(',')]
            for sel in selectors:
                result = self._extract_list_single_selector(soup, sel)
                if result:
                    return result
            return self.extract_offers_from_scripts(soup)
        else:
            result = self._extract_list_single_selector(soup, selector)
            if result:
                return result
            return self.extract_offers_from_scripts(soup)

    def _extract_list_single_selector(self, soup, selector):
        # Try compiled selector first
        compiled = self.compiled_selectors.get(selector)
        elements = None
        if compiled and compiled is not None:
            try:
                elements = sv.select(compiled, soup)
            except:
                elements = None
        
        # Fallback to direct CSS selection
        if not elements:
            try:
                elements = soup.select(selector)
            except:
                pass
        
        if elements:
            return [e.get_text(strip=True) for e in elements if e.get_text(strip=True)]
        
        return []

    def extract_from_script(self, soup, selector):
        """Extract title from script tags for Flipkart"""
        if selector == "script:product":
            # Try to find title in page title
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text(strip=True)
                # Remove common suffixes
                for suffix in [' - Buy Online', '| Flipkart.com', ' at Best Price', '- Flipkart']:
                    if suffix in title_text:
                        title_text = title_text.split(suffix)[0].strip()
                return title_text
            
            # Try meta og:title
            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                return og_title['content']
        return None
    
    def extract_price_from_scripts(self, soup):
        """Extract price information from script tags for Flipkart"""
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and ('price' in script.string.lower()):
                # Look for price patterns in JSON-like structures
                import re
                # Find price-related patterns
                price_patterns = [
                    r'"sellingPrice"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"price"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"final_price"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"effective_price"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"actual_price"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"mrp"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"maximumRetailPrice"\s*:\s*["\']?([0-9,]+)["\']?',
                    r'"discounted_price"\s*:\s*["\']?([0-9,]+)["\']?'
                ]
                
                for pattern in price_patterns:
                    matches = re.findall(pattern, script.string)
                    if matches:
                        # Return the first match found
                        return matches[0].replace(',', '')
        
        return None
    
    def extract_discount_from_scripts(self, soup):
        """Extract discount information from script tags for Flipkart"""
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and ('discount' in script.string.lower() or 'off' in script.string.lower()):
                # Look for discount patterns
                discount_patterns = [
                    r'(\d+)%\s*(?:off|discount)',
                    r'"discount"\s*:\s*["\']?([^"\']+?)["\']?',
                    r'"discount_percentage"\s*:\s*["\']?(\d+)["\']?',
                    r'"offered_price_info"\s*:\s*["\']?([^"\']+?)["\']?'
                ]
                
                for pattern in discount_patterns:
                    matches = re.findall(pattern, script.string)
                    if matches:
                        return matches[0]
        
        return None

    def extract_list_from_script(self, soup, selector):
        if selector == "script:offers":
            offers = []
            # Try to find offers in script data
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string:
                    # Look for offer-related JSON patterns
                    if 'offer' in script.string.lower():
                        # Extract offer titles using regex
                        offer_matches = re.findall(r'"offerTitle"\s*:\s*"([^"]+)"', script.string)
                        offers.extend(offer_matches)
                        # Also look for bank offer patterns
                        bank_matches = re.findall(r'"title"\s*:\s*"([^"]*(?:Bank|EMI|Cashback)[^"]*)"', script.string, re.IGNORECASE)
                        offers.extend(bank_matches)
            return list(set(offers)) if offers else []
        return []

    def extract_offers_from_scripts(self, soup):
        offers = []
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                text = script.string.lower()
                if 'offer' in text or 'emi' in text or 'bank' in text:
                    if 'no cost emi' in text:
                        offers.append('No Cost EMI')
                    if 'bank offer' in text:
                        offers.append('Bank Offer')
                    if 'limited time offer' in text:
                        offers.append('Limited Time Offer')
        return list(set(offers))

    def _is_bot_protection_page(self, soup):
        """Check if the page is a bot protection page"""
        # Check title
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text().lower()
            if 'online shopping' in title_text and 'india' in title_text and 'mobile' in title_text:
                return True
        
        # Check for bot protection indicators in body
        body_text = soup.get_text().lower()
        if any(indicator in body_text for indicator in ['bot', 'captcha', 'access denied', 'blocked', 'robot']):
            return True
        
        # Check for specific bot protection class or div
        bot_indicators = soup.find_all(attrs={'class': lambda x: x and 'bot' in x.lower()})
        if bot_indicators:
            return True
        
        return False

    def scrape(self):
        soup = self.fetch()
        
        # Check for bot protection indicators
        if self.platform == 'flipkart' and self._is_bot_protection_page(soup):
            return {
                "title": "Bot Protection Detected",
                "price": None,
                "original_price": None,
                "discount": "Bot protection active",
                "bank_offers": [],
                "availability": "Blocked by bot protection"
            }
        
        # Try JSON-LD extraction first (most reliable)
        jsonld_data = self.extract_jsonld(soup)
        
        result = {
            "title": None,
            "price": None,
            "original_price": None,
            "discount": None,
            "bank_offers": [],
            "availability": None
        }
        
        # Extract from JSON-LD if available
        if jsonld_data:
            result["title"] = jsonld_data.get("name")
            
            offers = jsonld_data.get("offers", {})
            if isinstance(offers, dict):
                price = offers.get("price")
                if price:
                    result["price"] = self._clean_price(price)
                availability = offers.get("availability", "")
                if "InStock" in str(availability):
                    result["availability"] = "In Stock"
                elif "OutOfStock" in str(availability):
                    result["availability"] = "Out of Stock"
        
        # Fill in missing data with CSS selectors
        if not result["title"]:
            result["title"] = self.extract(soup, self.selectors.get("title"), "title")
        
        if not result["price"]:
            result["price"] = self.extract(soup, self.selectors.get("price"), "price")
            # If still no price found and platform is Flipkart, try script extraction
            if not result["price"] and self.platform == "flipkart":
                result["price"] = self.extract_price_from_scripts(soup)
        
        if not result["original_price"]:
            result["original_price"] = self.extract(soup, self.selectors.get("original_price"), "original_price")
        
        if not result["discount"]:
            result["discount"] = self.extract(soup, self.selectors.get("discount"), "discount")
            # If still no discount found and platform is Flipkart, try script extraction
            if not result["discount"] and self.platform == "flipkart":
                result["discount"] = self.extract_discount_from_scripts(soup)
        
        if not result["bank_offers"]:
            result["bank_offers"] = self.extract_list(soup, self.selectors.get("bank_offers"))
        
        if not result["availability"]:
            result["availability"] = self.extract(soup, self.selectors.get("availability"), "availability")

        # Normalize discount to align with product page percentage when possible
        result["discount"] = self._normalize_discount(
            result["discount"], result["price"], result["original_price"]
        )
        
        # Additional check for Flipkart: if all fields are still null, it's probably blocked
        if (self.platform == 'flipkart' and 
            not result["title"] and 
            not result["price"] and 
            not result["original_price"] and 
            not result["discount"] and 
            result["bank_offers"] == [] and 
            not result["availability"]):
            return {
                "title": "Bot Protection Active",
                "price": None,
                "original_price": None,
                "discount": "Site blocked scraping attempt",
                "bank_offers": [],
                "availability": "Protected by anti-bot measures"
            }
        return result
