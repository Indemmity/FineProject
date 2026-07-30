import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./jobs.db"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # If DATABASE_URL is set but missing +asyncpg, add it for async support
        env_url = os.environ.get("DATABASE_URL", "")
        if env_url and env_url.startswith("postgresql://"):
            self.database_url = env_url.replace("postgresql://", "postgresql+asyncpg://")
        elif env_url:
            self.database_url = env_url

    # Scraping
    naukri_base_url: str = "https://www.naukri.com"
    remoteok_api_url: str = "https://remoteok.com/api"
    wellfound_base_url: str = "https://wellfound.com"
    indeed_base_url: str = "https://in.indeed.com"
    timesjobs_base_url: str = "https://www.timesjobs.com"
    monster_base_url: str = "https://www.monsterindia.com"

    # Selenium
    selenium_timeout: int = 30
    user_agent_rotation: bool = True

    # Firecrawl
    firecrawl_api_key: str | None = None

    # General
    log_level: str = "INFO"
    max_results_per_source: int = 100

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()