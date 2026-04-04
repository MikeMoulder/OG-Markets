from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select, delete

from ..core.config import settings
from ..core.cache import price_cache
from ..database import async_session
from ..models import PriceSnapshot
from .token_registry import COINGECKO_IDS, CG_ID_TO_SYMBOL

logger = logging.getLogger(__name__)


async def fetch_all_prices() -> dict[str, dict]:
    """Fetch prices for all curated tokens from CoinGecko bulk endpoint."""
    headers: dict[str, str] = {}
    if settings.coingecko_api_key:
        headers["x-cg-demo-api-key"] = settings.coingecko_api_key

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.coingecko_base_url}/coins/markets",
            headers=headers,
            params={
                "vs_currency": "usd",
                "ids": COINGECKO_IDS,
                "order": "market_cap_desc",
                "per_page": 15,
                "page": 1,
                "sparkline": "true",
                "price_change_percentage": "1h,24h,7d",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    prices: dict[str, dict] = {}
    now = datetime.now(timezone.utc).isoformat()

    for coin in data:
        cg_id = coin.get("id", "")
        symbol = CG_ID_TO_SYMBOL.get(cg_id)
        if not symbol:
            continue

        sparkline_raw = coin.get("sparkline_in_7d", {}).get("price", [])
        # Keep last 168 points (7 days hourly)
        sparkline = [round(p, 4) for p in sparkline_raw[-168:]] if sparkline_raw else None

        prices[symbol] = {
            "price_usd": coin.get("current_price"),
            "change_1h_pct": coin.get("price_change_percentage_1h_in_currency"),
            "change_24h_pct": coin.get("price_change_percentage_24h_in_currency"),
            "change_7d_pct": coin.get("price_change_percentage_7d_in_currency"),
            "volume_24h_usd": coin.get("total_volume"),
            "market_cap_usd": coin.get("market_cap"),
            "high_24h": coin.get("high_24h"),
            "low_24h": coin.get("low_24h"),
            "sparkline_7d": sparkline,
            "last_updated": now,
        }

    return prices


async def refresh_prices() -> None:
    """Fetch fresh prices and update cache + DB."""
    try:
        prices = await fetch_all_prices()
        price_cache["all_prices"] = prices
        logger.info("Refreshed prices for %d tokens", len(prices))

        # Persist latest snapshot to DB (best-effort)
        try:
            await _save_prices_to_db(prices)
        except Exception as e:
            logger.warning("Failed to persist prices to DB: %s", e)
    except Exception as e:
        logger.error("Failed to refresh prices: %s", e)


async def load_prices_from_db() -> dict[str, dict] | None:
    """Load the most recent price snapshot from the database.

    Returns the prices dict if found, or None if the table is empty.
    Used on startup so the cache is warm before CoinGecko responds.
    """
    async with async_session() as db:
        result = await db.execute(
            select(PriceSnapshot).order_by(PriceSnapshot.fetched_at.desc()).limit(50)
        )
        rows = result.scalars().all()

    if not rows:
        return None

    prices: dict[str, dict] = {}
    for row in rows:
        if row.symbol in prices:
            continue  # already have a newer row for this symbol
        sparkline = json.loads(row.sparkline_7d) if row.sparkline_7d else None
        prices[row.symbol] = {
            "price_usd": row.price_usd,
            "change_1h_pct": row.change_1h_pct,
            "change_24h_pct": row.change_24h_pct,
            "change_7d_pct": row.change_7d_pct,
            "volume_24h_usd": row.volume_24h_usd,
            "market_cap_usd": row.market_cap_usd,
            "high_24h": row.high_24h,
            "low_24h": row.low_24h,
            "sparkline_7d": sparkline,
            "last_updated": row.fetched_at.isoformat() if row.fetched_at else None,
        }

    logger.info("Loaded %d token prices from DB cache", len(prices))
    return prices


async def _save_prices_to_db(prices: dict[str, dict]) -> None:
    """Replace the stored price snapshots with the latest data."""
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        # Delete old snapshots (keep only latest batch)
        await db.execute(delete(PriceSnapshot))
        for symbol, data in prices.items():
            sparkline_json = json.dumps(data.get("sparkline_7d")) if data.get("sparkline_7d") else None
            db.add(PriceSnapshot(
                symbol=symbol,
                price_usd=data.get("price_usd", 0),
                change_1h_pct=data.get("change_1h_pct"),
                change_24h_pct=data.get("change_24h_pct"),
                change_7d_pct=data.get("change_7d_pct"),
                volume_24h_usd=data.get("volume_24h_usd"),
                market_cap_usd=data.get("market_cap_usd"),
                high_24h=data.get("high_24h"),
                low_24h=data.get("low_24h"),
                sparkline_7d=sparkline_json,
                fetched_at=now,
            ))
        await db.commit()
