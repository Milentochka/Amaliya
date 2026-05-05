from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hooks (DB warmup, bot polling, etc.) will go here.
    yield
    # Shutdown hooks


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Amaliya API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.app_frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    return app


app = create_app()
