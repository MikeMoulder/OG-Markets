from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --- Request ---

class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str = Field(min_length=1, max_length=10)
    timeframe: Literal["1h", "4h"]


# --- Token / Price ---

class TokenPrice(BaseModel):
    symbol: str
    name: str
    price_usd: float | None = None
    change_1h_pct: float | None = None
    change_24h_pct: float | None = None
    change_7d_pct: float | None = None
    volume_24h_usd: float | None = None
    market_cap_usd: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    sparkline_7d: list[float] | None = None
    last_updated: str | None = None


class TokenListResponse(BaseModel):
    tokens: list[TokenPrice]


class PricesResponse(BaseModel):
    prices: dict[str, dict]
    updated_at: str | None = None


# --- Prediction ---

class ProofBundle(BaseModel):
    model: str
    settlement_mode: str
    receipt_id: str
    tee_signature: str | None = None
    transaction_hash: str | None = None


class PredictionData(BaseModel):
    id: int
    symbol: str
    timeframe: str
    current_price: float
    target_price: float
    range_low: float
    range_high: float
    confidence_pct: int = Field(ge=0, le=100)
    direction: Literal["bullish", "bearish", "neutral"]
    reasoning: str
    key_factors: list[str]
    risk_factors: list[str]
    created_at: str


class PredictionResponse(BaseModel):
    prediction: PredictionData
    proof: ProofBundle
    disclaimer: str = "AI-generated forecast. Not financial advice."


class PredictionListResponse(BaseModel):
    predictions: list[PredictionData]
    total: int
