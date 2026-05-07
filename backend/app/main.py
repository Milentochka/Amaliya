from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_auth import router as admin_auth_router
from app.api.admin_wishlist import router as admin_wishlist_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.wishlist import router as wishlist_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


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
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_auth_router, prefix="/api")
    app.include_router(wishlist_router, prefix="/api")
    app.include_router(admin_wishlist_router, prefix="/api")
    return app


app = create_app()
