"""
TimesJobs adapter — Selenium-based scraper for timesjobs.com.

CSS selectors confirmed working as of July 2026 (Tailwind CSS redesign):
- Job cards: div.srp-card
- Title: h2
- Company: span within info div (text before "|")
- Posted date: text after "Posted on:"
"""

import hashlib
import re
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

BASE_URL = "https://www.timesjobs.com"


class TimesJobsAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "timesjobs"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _build_search_url(self, keyword: str, location: str | None) -> str:
        url = (
            f"{BASE_URL}/candidate/job-search.html"
            f"?searchType=personalizedSearch&from=submit"
            f"&txtKeywords={keyword}"
        )
        if location:
            url += f"&txtLocation={location}"
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
        return webdriver.Chrome(options=options)

    def _extract_listings(self, driver: webdriver.Chrome, keyword: str) -> list[RawJobListing]:
        listings = []
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.srp-card"))
            )
        except TimeoutException:
            return []

        cards = driver.find_elements(By.CSS_SELECTOR, "div.srp-card")
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
            title_el = card.find_element(By.TAG_NAME, "h2")
            title = title_el.text.strip()
        except NoSuchElementException:
            return None

        if not title:
            return None

        card_text = card.text
        lines = [l.strip() for l in card_text.split("\n") if l.strip()]

        company = ""
        posted_date = ""
        location = ""
        salary = ""

        if len(lines) >= 2:
            company = lines[1]
            if company == "|" and len(lines) >= 3:
                company = lines[2]

        for line in lines:
            if "Posted on:" in line:
                m = re.search(r"Posted on:\s*(\S+)", line)
                if m:
                    posted_date = m.group(1)
            if "Yrs" in line or "Year" in line:
                pass
            if "Not disclosed" in line or "₹" in line or "$" in line:
                salary = line

        if not location:
            for line in lines:
                loc_keywords = ["Bangalore", "Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata", "Gurgaon", "Noida", "Ahmedabad"]
                if any(k in line for k in loc_keywords) and "Location" not in line:
                    location = line
                    break

        if not company:
            for i, line in enumerate(lines):
                if "Google" in line or "Microsoft" in line or "Amazon" in line or "Infosys" in line or "TCS" in line or "Wipro" in line or "Accenture" in line:
                    company = line
                    break

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]

        return RawJobListing(
            source="timesjobs",
            source_id=raw_id,
            title=title,
            company=company,
            location=location or None,
            description="",
            salary_range=salary or None,
            job_type=None,
            url="",
            posted_date=posted_date or None,
            raw_data={"keyword": keyword},
        )

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)
