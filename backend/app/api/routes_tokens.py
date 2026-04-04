from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Token
from ..schemas import TokenPrice, TokenListResponse
from ..core.cache import price_cache
from ..core.config import settings

router = APIRouter()


@router.get("/tokens", response_model=TokenListResponse)
async def list_tokens(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Token).where(Token.is_active == True).order_by(Token.rank)
    )
    tokens = result.scalars().all()

    cached_prices: dict = price_cache.get("all_prices", {})

    items: list[TokenPrice] = []
    for t in tokens:
        price_data = cached_prices.get(t.symbol, {})
        items.append(
            TokenPrice(
                symbol=t.symbol,
                name=t.name,
                price_usd=price_data.get("price_usd"),
                change_1h_pct=price_data.get("change_1h_pct"),
                change_24h_pct=price_data.get("change_24h_pct"),
                change_7d_pct=price_data.get("change_7d_pct"),
                volume_24h_usd=price_data.get("volume_24h_usd"),
                market_cap_usd=price_data.get("market_cap_usd"),
                high_24h=price_data.get("high_24h"),
                low_24h=price_data.get("low_24h"),
                sparkline_7d=price_data.get("sparkline_7d"),
                last_updated=price_data.get("last_updated"),
            )
        )
    resp = JSONResponse(content=TokenListResponse(tokens=items).model_dump())
    resp.headers["Cache-Control"] = f"public, max-age={settings.price_refresh_seconds // 2}"
    return resp
