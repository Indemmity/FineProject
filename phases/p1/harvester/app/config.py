from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./jobs.db"

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