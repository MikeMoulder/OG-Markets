from __future__ import annotations

from fastapi import APIRouter

from ..core.cache import price_cache
from ..schemas import PricesResponse

router = APIRouter()


@router.get("/prices", response_model=PricesResponse)
async def get_prices():
    cached: dict = price_cache.get("all_prices", {})
    prices = {}
    for symbol, data in cached.items():
        prices[symbol] = {
            "price_usd": data.get("price_usd"),
            "change_1h_pct": data.get("change_1h_pct"),
            "change_24h_pct": data.get("change_24h_pct"),
        }
    updated = next(
        (d.get("last_updated") for d in cached.values() if d.get("last_updated")),
        None,
    )
    return PricesResponse(prices=prices, updated_at=updated)
