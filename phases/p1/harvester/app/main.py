from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import structlog

from .routes import jobs, export
from .middleware.error_handler import register_error_handlers
from .config import settings

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialise DB on startup, close on shutdown."""
    print(f"[HARVESTER] Starting up...")
    print(f"[HARVESTER] Database URL: {settings.database_url[:60]}...")
    print(f"[HARVESTER] DATABASE_URL env: {'SET' if os.environ.get('DATABASE_URL') else 'NOT SET'}")
    
    logger.info("Initialising database connection...")
    try:
        await init_db(settings.database_url)
        print("[HARVESTER] Database connected!")
        logger.info("Database connection established")
    except Exception as e:
        print(f"[HARVESTER] Database connection FAILED: {e}")
        logger.error("Failed to connect to database", exc_info=e)
    yield
    await close_db()
    logger.info("Database connection closed")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Job Harvester Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
    app.include_router(export.router, prefix="/api/jobs", tags=["export"])

    @app.get("/health")
    async def health():
        import time
        return {
            "status": "healthy",
            "service": "harvester",
            "uptime": time.time(),
            "db_configured": bool(os.environ.get("DATABASE_URL")),
        }

    @app.get("/")
    async def root():
        return {
            "service": "harvester",
            "docs": "/docs",
            "health": "/health",
            "api": "/api/jobs/",
        }

    return app


app = create_app()
