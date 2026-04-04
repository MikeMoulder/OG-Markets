from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Prediction
from ..schemas import (
    PredictRequest,
    PredictionResponse,
    PredictionData,
    PredictionListResponse,
    ProofBundle,
)
from ..core.cache import prediction_cache
from ..services.prediction_pipeline import generate_prediction

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictRequest, db: AsyncSession = Depends(get_db)):
    cache_key = f"{req.symbol.upper()}:{req.timeframe}"
    cached = prediction_cache.get(cache_key)
    if cached is not None:
        return cached

    result = await generate_prediction(req.symbol.upper(), req.timeframe, db)
    prediction_cache[cache_key] = result
    return result


@router.get("/predictions", response_model=PredictionListResponse)
async def list_predictions(
    symbol: str | None = None,
    timeframe: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Prediction).order_by(Prediction.created_at.desc())
    count_query = select(func.count(Prediction.id))

    if symbol:
        query = query.where(Prediction.symbol == symbol.upper())
        count_query = count_query.where(Prediction.symbol == symbol.upper())
    if timeframe:
        query = query.where(Prediction.timeframe == timeframe)
        count_query = count_query.where(Prediction.timeframe == timeframe)

    query = query.limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    predictions = [
        PredictionData(
            id=r.id,
            symbol=r.symbol,
            timeframe=r.timeframe,
            current_price=r.current_price,
            target_price=r.target_price,
            range_low=r.range_low,
            range_high=r.range_high,
            confidence_pct=r.confidence_pct,
            direction=r.direction,
            reasoning=r.reasoning,
            key_factors=json.loads(r.key_factors),
            risk_factors=json.loads(r.risk_factors),
            created_at=r.created_at.isoformat() + "Z",
        )
        for r in rows
    ]
    return PredictionListResponse(predictions=predictions, total=total)
