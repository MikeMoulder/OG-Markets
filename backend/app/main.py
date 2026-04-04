from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .database import engine, async_session
from .models import Base
from .services.token_registry import seed_tokens
from .services.market_data import refresh_prices, load_prices_from_db
from .api.routes_tokens import router as tokens_router
from .api.routes_prices import router as prices_router
from .api.routes_predictions import router as predictions_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _price_refresh_loop() -> None:
    """Background task: refresh prices periodically."""
    while True:
        await refresh_prices()
        await asyncio.sleep(settings.price_refresh_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + seed tokens
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        await seed_tokens(db)
    logger.info("Database initialized and tokens seeded")

    # Load cached prices from DB so the first request is instant
    db_prices = await load_prices_from_db()
    if db_prices:
        from .core.cache import price_cache
        price_cache["all_prices"] = db_prices
        logger.info("Warm-started cache from DB (%d tokens)", len(db_prices))

    # Initial price fetch (updates cache + DB)
    await refresh_prices()

    # Start background price refresh
    task = asyncio.create_task(_price_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

allowed_origins = [settings.frontend_origin, "https://og-markets.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tokens_router, prefix="/api")
app.include_router(prices_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
