"""
Naukri adapter — Selenium-based scraper for naukri.com.

Handles:
- Search page navigation with pagination
- Cookie consent dismissal
- Rate limiting between requests
- Extraction of title, company, location, salary, description, posted date, URL
"""

import hashlib
import time
from typing import Any

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

from ..config import settings
from .base import JobSourceAdapter, SearchParams, RawJobListing

BASE_URL = "https://www.naukri.com"


class NaukriAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "naukri"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        """Run the Selenium scraper. Note: runs synchronously in a thread pool."""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _build_search_url(self, keyword: str, location: str | None) -> str:
        """Build Naukri search URL with optional location."""
        base = f"{BASE_URL}/{keyword}-jobs"
        if location:
            loc_slug = location.strip().lower().replace(" ", "-")
            return f"{base}-in-{loc_slug}"
        return base

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        """Synchronous Selenium search."""
        driver = self._create_driver()
        try:
            listings = []
            keyword = "+".join(params.keywords)
            location = params.location
            search_url = self._build_search_url(keyword, location)

            for page in range(3):  # scrape up to 3 pages
                try:
                    driver.get(search_url if page == 0 else f"{search_url}-{page + 1}")
                except Exception:
                    break

                self._dismiss_cookie_consent(driver)
                time.sleep(2)  # rate limiting

                page_listings = self._extract_listings(driver, keyword)
                listings.extend(page_listings)

                # Check for next page
                if not self._has_next_page(driver):
                    break

                time.sleep(settings.selenium_timeout / 10)  # rate limiting

            return listings
        finally:
            driver.quit()

    def _create_driver(self) -> webdriver.Chrome:
        """Create a headless Chrome driver."""
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")

        if settings.user_agent_rotation:
            options.add_argument(
                "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )

        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)

    def _dismiss_cookie_consent(self, driver: webdriver.Chrome) -> None:
        """Try to dismiss cookie consent banners."""
        try:
            reject_btn = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Reject') or contains(text(), 'reject') or contains(text(), 'Accept') or contains(text(), 'Got it')]"))
            )
            reject_btn.click()
        except (TimeoutException, NoSuchElementException, Exception):
            pass

    def _extract_listings(self, driver: webdriver.Chrome, keyword: str) -> list[RawJobListing]:
        """Extract job listings from the current page."""
        listings = []
        try:
            job_cards = WebDriverWait(driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".cust-job-tuple"))
            )
        except TimeoutException:
            return []

        # Extract from cards directly — skip detail page visits (too slow)
        for card in job_cards:
            try:
                data = self._extract_card_basic(card, keyword)
                if data:
                    listings.append(self._create_listing(data, keyword))
            except Exception:
                continue

        return listings

    def _extract_card_basic(self, card: Any, keyword: str) -> dict[str, Any] | None:
        """Extract basic data from a single job card element."""
        try:
            title_el = card.find_element(By.CSS_SELECTOR, "a.title")
            title = title_el.text.strip()
        except NoSuchElementException:
            return None

        try:
            company_el = card.find_element(By.CSS_SELECTOR, "a.comp-name")
            company = company_el.text.strip()
        except NoSuchElementException:
            company = ""

        try:
            location_el = card.find_element(By.CSS_SELECTOR, "span.locWdth")
            location = location_el.get_attribute("title") or location_el.text.strip()
        except NoSuchElementException:
            location = None

        try:
            salary_el = card.find_element(By.CSS_SELECTOR, "[class*='salary']")
            salary = salary_el.text.strip()
        except NoSuchElementException:
            salary = None

        try:
            desc_el = card.find_element(By.CSS_SELECTOR, "span.job-desc")
            description = desc_el.text.strip()
        except NoSuchElementException:
            description = ""

        try:
            url_el = card.find_element(By.CSS_SELECTOR, "a.title")
            url = url_el.get_attribute("href") or ""
        except NoSuchElementException:
            url = ""

        try:
            posted_el = card.find_element(By.CSS_SELECTOR, "span.job-post-day")
            posted_date = posted_el.text.strip()
        except NoSuchElementException:
            posted_date = None

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]

        return {
            'title': title,
            'company': company,
            'location': location,
            'description': description,
            'salary': salary,
            'url': url,
            'posted_date': posted_date,
            'raw_id': raw_id,
        }

    def _get_full_description(self, url: str) -> str | None:
        """Fetch full job description from detail page."""
        if not url:
            return None
            
        try:
            driver = self._create_driver()
            try:
                driver.get(url)
                time.sleep(2)
                self._dismiss_cookie_consent(driver)
                
                # Try multiple selectors for full job description
                desc_selectors = [
                    ".job-desc",
                    ".detailed-job-profile",
                    "[class*='job-description']",
                    "#jobDescription",
                    ".JD",
                    ".job-details",
                    "[class*='description']",
                    ".styles_JD__",
                    ".styles_job-desc__"
                ]
                
                for selector in desc_selectors:
                    try:
                        full_desc_el = driver.find_element(By.CSS_SELECTOR, selector)
                        full_text = full_desc_el.text.strip()
                        if full_text and len(full_text) > 100:  # Only use if substantial
                            return full_text
                    except NoSuchElementException:
                        continue
                return None
            finally:
                driver.quit()
        except Exception:
            return None

    def _create_listing(self, data: dict[str, Any], keyword: str) -> RawJobListing:
        """Create RawJobListing from extracted data."""
        return RawJobListing(
            source="naukri",
            source_id=data['raw_id'],
            title=data['title'],
            company=data['company'],
            location=data['location'],
            description=data['description'],
            salary_range=data['salary'],
            job_type="full-time",
            url=data['url'],
            posted_date=data['posted_date'],
            raw_data={"keyword": keyword},
        )

    def _has_next_page(self, driver: webdriver.Chrome) -> bool:
        """Check if there's a next page button."""
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, "a[class*='next'], [aria-label='Next'], [rel='next'], [class*='page-btn']:not([class*='disabled'])")
            return bool(next_btn)
        except NoSuchElementException:
            return False

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)