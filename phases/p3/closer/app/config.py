from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    sender_name: str = ""

    # Operation
    dry_run: bool = True
    send_mode: str = "draft"
    max_outreach_per_run: int = 5

    # Rate limiting
    rate_limit_emails_per_hour: int = 20
    rate_limit_emails_per_day: int = 100

    # General
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()