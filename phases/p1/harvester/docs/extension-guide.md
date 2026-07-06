# Adding a New Job Source — Extension Guide

## Interface Contract

Every source adapter must implement the `JobSourceAdapter` abstract base class:

```python
from app.adapters.base import JobSourceAdapter, SearchParams, RawJobListing

class MySourceAdapter(JobSourceAdapter):
    @property
    def source_name(self) -> str:
        return "my-source"

    async def search(self, params: SearchParams) -> list[RawJobListing]:
        # Fetch listings from your source
        ...

    async def normalize(self, raw: RawJobListing) -> dict:
        # Convert to shared format (or delegate to shared normalizer)
        from app.normalizer import normalize
        return normalize(raw)
```

## Steps

1. **Create the adapter file** — `app/adapters/mysource.py`
2. **Implement `search()`** — fetch listings using HTTP, Selenium, or Firecrawl
3. **Implement `normalize()`** — use the shared normalizer or write custom logic
4. **Register in the factory** — add to `ADAPTER_REGISTRY` in `app/adapters/__init__.py`
5. **Add tests** — create `tests/test_mysource.py` with mock data in `tests/mock_data/`
6. **Add env vars** — add any new config to `config.py` and `.env.example`

## Data Contracts

### SearchParams
```python
@dataclass
class SearchParams:
    keywords: list[str]
    location: str | None = None
    remote_only: bool = False
    experience_level: str | None = None
    date_posted: int | None = None
```

### RawJobListing
```python
@dataclass
class RawJobListing:
    source: str          # Fixed per adapter
    source_id: str       # Unique within source
    title: str
    company: str
    location: str | None
    description: str
    description_html: str
    salary_range: str | None
    job_type: str | None
    remote: bool
    experience_level: str | None
    posted_date: str | None  # Raw date string; normalizer handles parsing
    url: str
    raw_data: dict
```

## NormalizedJob Format (DB schema)

After `normalize()`, the dict must match these keys:
`source`, `source_id`, `title`, `company`, `location`, `description`, `description_html`, `salary_range`, `job_type`, `remote`, `experience_level`, `posted_date`, `url`, `raw`

## Adapter Guidelines

- **HTTP APIs**: Use `httpx.AsyncClient` with timeouts
- **Selenium scrapers**: Use headless Chrome; handle cookie consent; respect `robots.txt`
- **Rate limiting**: Respect `settings.selenium_timeout` between requests
- **Error handling**: Return empty list on failure rather than raising
- **Source ID**: Must be deterministic for the same listing (hash of title+company)