from __future__ import annotations

import json
import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Token, Prediction
from ..schemas import PredictionResponse, PredictionData, ProofBundle
from ..core.cache import price_cache
from .opengradient_client import PredictionClient

logger = logging.getLogger(__name__)


async def generate_prediction(
    symbol: str, timeframe: str, db: AsyncSession
) -> PredictionResponse:
    # 1. Validate token exists
    result = await db.execute(
        select(Token).where(Token.symbol == symbol, Token.is_active == True)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(404, f"Token {symbol} not found")

    if timeframe not in ("1h", "4h"):
        raise HTTPException(400, "Timeframe must be '1h' or '4h'")

    # 2. Get market data
    cached_prices: dict = price_cache.get("all_prices", {})
    market_data = cached_prices.get(symbol, {})
    if not market_data or not market_data.get("price_usd"):
        raise HTTPException(503, f"No price data available for {symbol}")

    # 3. Build compact market data for prompt (exclude sparkline to save tokens)
    prompt_data = {
        "symbol": symbol,
        "price_usd": market_data["price_usd"],
        "change_1h_pct": market_data.get("change_1h_pct"),
        "change_24h_pct": market_data.get("change_24h_pct"),
        "change_7d_pct": market_data.get("change_7d_pct"),
        "volume_24h_usd": market_data.get("volume_24h_usd"),
        "market_cap_usd": market_data.get("market_cap_usd"),
        "high_24h": market_data.get("high_24h"),
        "low_24h": market_data.get("low_24h"),
    }

    # 4. Call OpenGradient
    client = PredictionClient()
    prediction_result = await client.predict(symbol, timeframe, prompt_data)

    payload = prediction_result.payload

    # 5. Store in database
    pred = Prediction(
        symbol=symbol,
        timeframe=timeframe,
        current_price=prompt_data["price_usd"],
        target_price=payload["target_price"],
        range_low=payload["range_low"],
        range_high=payload["range_high"],
        confidence_pct=payload["confidence_pct"],
        direction=payload["direction"],
        reasoning=payload["reasoning"],
        key_factors=json.dumps(payload["key_factors"]),
        risk_factors=json.dumps(payload["risk_factors"]),
        model_used=prediction_result.model,
        settlement_mode=prediction_result.settlement_mode,
        receipt_id=prediction_result.receipt_id,
        tee_signature=prediction_result.tee_signature,
        transaction_hash=prediction_result.transaction_hash,
    )
    db.add(pred)
    await db.commit()
    await db.refresh(pred)

    # 6. Build response
    return PredictionResponse(
        prediction=PredictionData(
            id=pred.id,
            symbol=pred.symbol,
            timeframe=pred.timeframe,
            current_price=pred.current_price,
            target_price=pred.target_price,
            range_low=pred.range_low,
            range_high=pred.range_high,
            confidence_pct=pred.confidence_pct,
            direction=pred.direction,
            reasoning=pred.reasoning,
            key_factors=payload["key_factors"],
            risk_factors=payload["risk_factors"],
            created_at=pred.created_at.isoformat() + "Z",
        ),
        proof=ProofBundle(
            model=prediction_result.model,
            settlement_mode=prediction_result.settlement_mode,
            receipt_id=prediction_result.receipt_id,
            tee_signature=prediction_result.tee_signature,
            transaction_hash=prediction_result.transaction_hash,
        ),
    )
