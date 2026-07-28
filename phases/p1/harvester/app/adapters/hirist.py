"""
Hirist adapter — Selenium-based scraper for hirist.com.

Extracts job listings from Hirist India (tech-focused) search results.
"""

import hashlib
import time
from typing import Any

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from ..config import settings
from .base import JobSourceAdapter, SearchParams, RawJobListing

BASE_URL = "https://www.hirist.com"


class HiristAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "hirist"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _build_search_url(self, keyword: str) -> str:
        return f"{BASE_URL}/search/jobs?q={keyword}"

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        driver = self._create_driver()
        try:
            keyword = "+".join(params.keywords)
            search_url = self._build_search_url(keyword)

            driver.get(search_url)
            time.sleep(4)

            for _ in range(3):
                self._scroll_page(driver)
                time.sleep(1)

            listings = self._extract_listings(driver, keyword)

            return listings[:30]
        finally:
            driver.quit()

    def _create_driver(self) -> webdriver.Chrome:
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

    def _scroll_page(self, driver: webdriver.Chrome) -> None:
        try:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        except Exception:
            pass

    def _extract_listings(self, driver: webdriver.Chrome, keyword: str) -> list[RawJobListing]:
        listings = []
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[class*='card'], [class*='job'], article, .job-card"))
            )
        except TimeoutException:
            return []

        cards = driver.find_elements(By.CSS_SELECTOR, "[class*='card']:not([class*='header']):not([class*='nav']), .job-card, article[class*='job'], div[class*='job-card']")

        seen = set()
        for card in cards:
            try:
                h = card.tag_name + "." + (card.get_attribute("class") or "")
                if "header" in h.lower() or "nav" in h.lower() or "footer" in h.lower():
                    continue
            except Exception:
                pass

            try:
                listing = self._extract_card(card, keyword)
                if listing and listing.source_id not in seen:
                    seen.add(listing.source_id)
                    listings.append(listing)
            except Exception:
                continue

        return listings

    def _extract_card(self, card: Any, keyword: str) -> RawJobListing | None:
        try:
            title_el = card.find_element(By.CSS_SELECTOR, "h2, h3, [class*='title'], [class*='heading'] a, a[href*='job']")
            title = title_el.text.strip()
            url = title_el.get_attribute("href") or ""
        except NoSuchElementException:
            return None

        if not title:
            return None

        try:
            company_el = card.find_element(By.CSS_SELECTOR, "[class*='company'], [class*='comp'], [class*='org'], [class*='employer']")
            company = company_el.text.strip()
        except NoSuchElementException:
            company = ""

        try:
            location_el = card.find_element(By.CSS_SELECTOR, "[class*='location'], [class*='loc'], svg ~ span, li[class*='loc']")
            location = location_el.text.strip()
        except NoSuchElementException:
            location = ""

        try:
            salary_el = card.find_element(By.CSS_SELECTOR, "[class*='salary'], [class*='pay'], [class*='ctc'], [class*='lpa'], span:has-text('₹'), span:has-text('L')")
            salary = salary_el.text.strip()
        except NoSuchElementException:
            salary = ""

        try:
            desc_el = card.find_element(By.CSS_SELECTOR, "[class*='desc'], [class*='skill'], [class*='tag'], p")
            description = desc_el.text.strip()
        except NoSuchElementException:
            description = ""

        try:
            date_el = card.find_element(By.CSS_SELECTOR, "[class*='date'], [class*='time'], [class*='posted'], [class*='day']")
            posted_date = date_el.text.strip()
        except NoSuchElementException:
            posted_date = ""

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]

        return RawJobListing(
            source="hirist",
            source_id=raw_id,
            title=title,
            company=company,
            location=location or None,
            description=description,
            salary_range=salary or None,
            job_type=None,
            url=url,
            posted_date=posted_date or None,
            raw_data={"keyword": keyword},
        )

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)
