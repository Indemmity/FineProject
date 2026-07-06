from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/jobplatform"

    # Scraping
    naukri_base_url: str = "https://www.naukri.com"
    remoteok_api_url: str = "https://remoteok.com/api"
    wellfound_base_url: str = "https://wellfound.com"

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