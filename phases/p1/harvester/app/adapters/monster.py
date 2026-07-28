"""
Monster India (monsterindia.com) adapter — Selenium-based scraper.

CSS selectors confirmed working as of July 2026:
- Job cards: div.cardContainer.activeCard
- Title: div.jobTitle
- Company: div.companyName p
- Location: .details.location
- Experience: .experienceSalary .details
- Posted date: .jobAddedTime .timeText
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

BASE_URL = "https://www.monsterindia.com"


class MonsterAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "monster"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _build_search_url(self, keyword: str, location: str | None) -> str:
        url = f"{BASE_URL}/srp/results?query={keyword}"
        if location:
            url += f"&locations={location}"
        return url

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        driver = self._create_driver()
        try:
            keyword = "+".join(params.keywords)
            location = params.location
            search_url = self._build_search_url(keyword, location)

            driver.get(search_url)
            time.sleep(4)

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

    def _extract_listings(self, driver: webdriver.Chrome, keyword: str) -> list[RawJobListing]:
        listings = []
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.cardContainer"))
            )
        except TimeoutException:
            return []

        cards = driver.find_elements(By.CSS_SELECTOR, "div.cardContainer")
        seen = set()
        for card in cards:
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
            title_el = card.find_element(By.CSS_SELECTOR, "div.jobTitle")
            title = title_el.text.strip()
        except NoSuchElementException:
            return None

        if not title:
            return None

        try:
            company_el = card.find_element(By.CSS_SELECTOR, "div.companyName p, div.companyName")
            company = company_el.text.strip()
        except NoSuchElementException:
            company = ""

        try:
            location_el = card.find_element(By.CSS_SELECTOR, ".details.location")
            location = location_el.text.strip()
        except NoSuchElementException:
            location = ""

        try:
            salary_el = card.find_element(By.CSS_SELECTOR, ".experienceSalary .salary, [class*='salary'], .details[class*='salary']")
            salary = salary_el.text.strip()
        except NoSuchElementException:
            salary = ""

        try:
            experience_el = card.find_element(By.CSS_SELECTOR, ".experienceSalary .details")
            exp = experience_el.text.strip()
        except NoSuchElementException:
            exp = ""

        try:
            date_el = card.find_element(By.CSS_SELECTOR, ".jobAddedTime .timeText, .timeText")
            posted_date = date_el.text.strip()
        except NoSuchElementException:
            posted_date = ""

        description = ""
        if exp:
            description = f"Experience: {exp}"

        job_id = card.get_attribute("id") or ""
        url = f"{BASE_URL}/job-detail/{job_id}" if job_id else ""

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]

        return RawJobListing(
            source="monster",
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
