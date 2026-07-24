"""
Indeed adapter — Selenium-based scraper for in.indeed.com.

CSS selectors confirmed working as of July 2026:
- Job cards: a[data-jk] (16 per page)
- Company: [data-testid='company-name'], .companyName
- Location: [data-testid='text-location'], .companyLocation
- Salary: .salary-snippet-container, .salaryText
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

BASE_URL = "https://in.indeed.com"


class IndeedAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "indeed"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_sync, params)

    def _build_search_url(self, keyword: str, location: str | None) -> str:
        url = f"{BASE_URL}/jobs?q={keyword}"
        if location:
            url += f"&l={location}"
        return url

    def _search_sync(self, params: SearchParams) -> list[RawJobListing]:
        driver = self._create_driver()
        try:
            listings = []
            keyword = "+".join(params.keywords)
            location = params.location
            search_url = self._build_search_url(keyword, location)

            for page in range(3):
                page_url = search_url if page == 0 else f"{search_url}&start={page * 10}"
                try:
                    driver.get(page_url)
                except Exception:
                    break

                time.sleep(3)
                page_listings = self._extract_listings(driver, keyword)
                listings.extend(page_listings)

                if not self._has_next_page(driver):
                    break

                time.sleep(settings.selenium_timeout / 10)

            return listings
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
                EC.presence_of_element_located((By.CSS_SELECTOR, "a[data-jk]"))
            )
        except TimeoutException:
            return []

        links = driver.find_elements(By.CSS_SELECTOR, "a[data-jk]")
        seen = set()
        for link in links:
            try:
                listing = self._extract_from_link(link, keyword)
                if listing and listing.source_id not in seen:
                    seen.add(listing.source_id)
                    listings.append(listing)
            except Exception:
                continue

        return listings

    def _extract_from_link(self, link: Any, keyword: str) -> RawJobListing | None:
        title = link.get_attribute("title") or link.text.strip()
        url = link.get_attribute("href") or ""
        if not title:
            return None

        card = self._find_result_container(link)

        if not card:
            return None

        try:
            company_el = card.find_element(By.CSS_SELECTOR, "[data-testid='company-name'], .companyName")
            company = company_el.text.strip()
        except NoSuchElementException:
            company = ""

        try:
            location_el = card.find_element(By.CSS_SELECTOR, "[data-testid='text-location'], .companyLocation")
            location = location_el.text.strip()
        except NoSuchElementException:
            location = ""

        try:
            salary_el = card.find_element(By.CSS_SELECTOR, ".salary-snippet-container, .salaryText, span[class*='salary']")
            salary = salary_el.text.strip()
        except NoSuchElementException:
            salary = ""

        try:
            desc_el = card.find_element(By.CSS_SELECTOR, "[data-testid='job-snippet'], .job-snippet, div[class*='summary']")
            description = desc_el.text.strip()
        except NoSuchElementException:
            description = ""

        try:
            date_el = card.find_element(By.CSS_SELECTOR, "[data-testid='job-age'], .date, span[class*='date'], span[class*='age']")
            posted_date = date_el.text.strip()
        except NoSuchElementException:
            posted_date = ""

        raw_id = hashlib.md5(f"{title}:{company}:{keyword}:{url[:50]}".encode()).hexdigest()[:12]

        return RawJobListing(
            source="indeed",
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

    def _find_result_container(self, el: Any) -> Any | None:
        parent = el
        for _ in range(6):
            parent = parent.find_element(By.XPATH, "..")
            tag = parent.tag_name.lower()
            cls = (parent.get_attribute("class") or "").lower()
            if "resultcontent" in cls or "result" in cls:
                return parent
        return el

    def _has_next_page(self, driver: webdriver.Chrome) -> bool:
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, "a[aria-label='Next'], a[data-testid='pagination-page-next'], nav[aria-label='pagination'] a:last-child")
            return bool(next_btn)
        except NoSuchElementException:
            return False

    async def normalize(self, raw: RawJobListing) -> dict[str, Any]:
        from ..normalizer import normalize as _normalize
        return _normalize(raw)
