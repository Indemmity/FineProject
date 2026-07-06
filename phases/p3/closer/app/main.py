from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import structlog

from .routes import outreach

logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="The Closer - Outreach Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(outreach.router, prefix="/api/outreach", tags=["outreach"])

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    @app.get("/health")
    async def health():
        return {"status": "healthy", "service": "closer"}

    return app


app = create_app()