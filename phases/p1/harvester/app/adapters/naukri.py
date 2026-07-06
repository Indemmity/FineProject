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

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        """Synchronous Selenium search."""
        driver = self._create_driver()
        try:
            listings = []
            keyword = "+".join(params.keywords)
            search_url = f"{BASE_URL}/{keyword}-jobs"

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

        return webdriver.Chrome(options=options)

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
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "[class*='jobTuple'], [class*='job-card'], article"))
            )
        except TimeoutException:
            return []

        for card in job_cards:
            try:
                listing = self._extract_card(card, keyword)
                if listing:
                    listings.append(listing)
            except Exception:
                continue

        return listings

    def _extract_card(self, card: Any, keyword: str) -> RawJobListing | None:
        """Extract data from a single job card element."""
        try:
            title_el = card.find_element(By.CSS_SELECTOR, "[class*='title'], a[class*='jobTitle']")
            title = title_el.text.strip()
        except NoSuchElementException:
            return None

        try:
            company_el = card.find_element(By.CSS_SELECTOR, "[class*='subTitle'], [class*='company']")
            company = company_el.text.strip()
        except NoSuchElementException:
            company = ""

        try:
            location_el = card.find_element(By.CSS_SELECTOR, "[class*='location']")
            location = location_el.text.strip()
        except NoSuchElementException:
            location = None

        try:
            salary_el = card.find_element(By.CSS_SELECTOR, "[class*='salary']")
            salary = salary_el.text.strip()
        except NoSuchElementException:
            salary = None

        try:
            desc_el = card.find_element(By.CSS_SELECTOR, "[class*='description'], [class*='job-description']")
            description = desc_el.text.strip()
        except NoSuchElementException:
            description = ""

        try:
            url_el = card.find_element(By.CSS_SELECTOR, "a[href*='naukri.com']")
            url = url_el.get_attribute("href") or ""
        except NoSuchElementException:
            url = ""

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]

        return RawJobListing(
            source="naukri",
            source_id=raw_id,
            title=title,
            company=company,
            location=location,
            description=description,
            salary_range=salary,
            job_type="full-time",
            url=url,
            raw_data={"keyword": keyword},
        )

    def _has_next_page(self, driver: webdriver.Chrome) -> bool:
        """Check if there's a next page button."""
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, "a[class*='next'], [aria-label='Next'], [rel='next']")
            return bool(next_btn)
        except NoSuchElementException:
            return False

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)