"""
Wellfound (AngelList) adapter — Selenium-based scraper with improved parsing.

Bypasses Cloudflare using headless Chrome. Extracts job listings
from rendered Wellfound search page text using heuristics.
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
from selenium.common.exceptions import TimeoutException

from ..config import settings
from .base import JobSourceAdapter, SearchParams, RawJobListing

SEARCH_URL = "https://wellfound.com/search"

TITLE_KEYWORDS = [
    "engineer", "developer", "manager", "designer", "analyst",
    "scientist", "intern", "software", "architect", "product",
    "marketing", "sales", "data", "devops", "qa", "test",
    "frontend", "backend", "fullstack", "full stack", "mobile",
    "ios", "android", "ml", "ai", "machine learning",
    "infrastructure", "platform", "security", "sre",
]

LOCATION_KEYWORDS = [
    "san francisco", "new york", "remote", "austin", "seattle",
    "chicago", "bangalore", "bengaluru", "mumbai", "delhi", "pune",
    "los angeles", "london", "berlin", "toronto",
    "hyderabad", "chennai", "gurgaon", "noida",
]

SKIP_WORDS = [
    "startup", "public", "private company", "enterprise software company",
    "bio", "more", "help", "blog", "twitter", "terms", "privacy",
    "unsubscribe", "cookie", "press", "log in", "join", "all results",
    "software engineer salary",
]


class WellfoundAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "wellfound"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        driver = self._create_driver()
        try:
            keyword_query = "+".join(params.keywords)
            url = f"{SEARCH_URL}?q={keyword_query}"
            driver.get(url)
            time.sleep(5)
            return self._extract_listings(driver, keyword_query)
        finally:
            driver.quit()

    def _create_driver(self) -> webdriver.Chrome:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins")
        options.add_argument("--disable-images")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-features=TranslateUI")
        options.add_argument("--disable-ipc-flooding-protection")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        driver = webdriver.Chrome(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver

    def _is_skip_line(self, line: str) -> bool:
        lower = line.lower()
        for skip in SKIP_WORDS:
            if skip in lower:
                return True
        if len(line) < 4:
            return True
        if line in ("|", "-", "\u2022", "\u25be"):
            return True
        return False

    def _is_company_entry(self, line: str) -> bool:
        lower = line.lower()
        company_suffixes = ["startup", "public", "private company",
                            "enterprise software company", "public company",
                            "private"]
        for suffix in company_suffixes:
            if lower.endswith(suffix) or suffix in lower:
                return True
        return False

    def _is_location_line(self, line: str) -> bool:
        lower = line.lower()
        for loc in LOCATION_KEYWORDS:
            if loc in lower:
                return True
        return False

    def _is_salary_line(self, line: str) -> bool:
        return "$" in line or "\u20b9" in line or "\u20ac" in line or "\u00a3" in line

    def _extract_listings(self, driver: webdriver.Chrome, keyword: str) -> list[RawJobListing]:
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            return []

        body = driver.find_element(By.TAG_NAME, "body")
        text = body.text
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        listings = []
        i = 0
        while i < len(lines):
            line = lines[i]
            if self._is_skip_line(line):
                i += 1
                continue

            lower = line.lower()
            is_title = any(kw in lower for kw in TITLE_KEYWORDS)

            if is_title and not self._is_company_entry(line) and len(line) < 80:
                title = line
                company = ""
                location = ""
                salary = ""

                j = i + 1
                while j < len(lines) and j < i + 4:
                    next_line = lines[j]
                    if self._is_skip_line(next_line):
                        j += 1
                        continue

                    nl_lower = next_line.lower()

                    if self._is_location_line(next_line):
                        location = next_line
                    elif self._is_salary_line(next_line):
                        salary = next_line
                    elif not company and not self._is_company_entry(next_line) \
                            and len(next_line) < 60 and not self._is_location_line(next_line) \
                            and not self._is_salary_line(next_line):
                        company = next_line
                        break
                    j += 1

                if company and len(company) > 1:
                    raw_id = hashlib.md5(f"{title}:{company}:{keyword}".encode()).hexdigest()[:12]
                    listings.append(RawJobListing(
                        source="wellfound",
                        source_id=raw_id,
                        title=title,
                        company=company,
                        location=location or None,
                        salary_range=salary or None,
                        job_type=None,
                        url=f"{SEARCH_URL}?q={keyword}",
                        posted_date=None,
                        raw_data={"keyword": keyword},
                    ))

            i += 1

        return listings

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)
