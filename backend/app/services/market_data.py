from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import httpx

from ..core.config import settings
from ..core.cache import price_cache
from .token_registry import COINGECKO_IDS, CG_ID_TO_SYMBOL

logger = logging.getLogger(__name__)


async def fetch_all_prices() -> dict[str, dict]:
    """Fetch prices for all curated tokens from CoinGecko bulk endpoint."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.coingecko_base_url}/coins/markets",
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
    """Fetch fresh prices and update cache."""
    try:
        prices = await fetch_all_prices()
        price_cache["all_prices"] = prices
        logger.info("Refreshed prices for %d tokens", len(prices))
    except Exception as e:
        logger.error("Failed to refresh prices: %s", e)
