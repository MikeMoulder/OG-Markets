from __future__ import annotations

import json
import logging
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException

from ..core.config import settings
from .prompts import PREDICTION_SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    payload: dict
    receipt_id: str
    tee_signature: str | None
    transaction_hash: str | None
    model: str
    settlement_mode: str


class PredictionClient:
    _approval_done: bool = False

    def __init__(self) -> None:
        self.enabled = settings.opengradient_enabled
        self.allow_mock = settings.allow_mock_opengradient

    async def predict(
        self, symbol: str, timeframe: str, market_data: dict
    ) -> PredictionResult:
        if not self.enabled or not settings.opengradient_private_key:
            if self.allow_mock:
                return self._mock_prediction(symbol, timeframe, market_data)
            raise HTTPException(503, "OpenGradient not configured")

        try:
            import opengradient as og
        except ImportError:
            if self.allow_mock:
                return self._mock_prediction(symbol, timeframe, market_data)
            raise HTTPException(503, "opengradient SDK not installed")

        llm = og.LLM(private_key=settings.opengradient_private_key)

        if not PredictionClient._approval_done:
            try:
                llm.ensure_opg_approval(min_allowance=settings.opengradient_approval_amount)
                PredictionClient._approval_done = True
            except Exception as e:
                logger.warning("OPG approval failed: %s", e)

        user_prompt = build_user_prompt(symbol, timeframe, market_data)

        result = await llm.chat(
            model=self._resolve_model(og),
            messages=[
                {"role": "system", "content": PREDICTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=800,
            temperature=0.0,
            x402_settlement_mode=self._resolve_settlement(og),
        )

        raw_content = result.chat_output.get("content", "")
        # Strip markdown code fences if present
        cleaned = raw_content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse LLM response: %s\nRaw: %s", e, raw_content)
            raise HTTPException(502, "Invalid prediction response from AI model")

        receipt_id = self._extract_receipt(result)

        return PredictionResult(
            payload=payload,
            receipt_id=receipt_id,
            tee_signature=getattr(result, "tee_signature", None),
            transaction_hash=getattr(result, "transaction_hash", None),
            model=settings.opengradient_model,
            settlement_mode=settings.opengradient_settlement_mode,
        )

    def _resolve_model(self, og):
        raw = settings.opengradient_model
        attr = raw.replace("/", "_").replace("-", "_").replace(".", "_").upper()
        return getattr(og.TEE_LLM, attr, og.TEE_LLM.CLAUDE_SONNET_4_6)

    def _resolve_settlement(self, og):
        raw = settings.opengradient_settlement_mode
        return getattr(og.x402SettlementMode, raw, og.x402SettlementMode.BATCH_HASHED)

    @staticmethod
    def _extract_receipt(result) -> str:
        for field in ("payment_hash", "x402_payment_hash", "receipt_id"):
            val = getattr(result, field, None)
            if val:
                return str(val)
        return f"unknown-{uuid.uuid4().hex[:12]}"

    @staticmethod
    def _mock_prediction(symbol: str, timeframe: str, market_data: dict) -> PredictionResult:
        price = market_data.get("price_usd", 100.0) or 100.0
        change = market_data.get("change_1h_pct", 0.0) or 0.0

        # Simple heuristic-based mock
        momentum = change / 100.0
        multiplier = 1.0 + momentum * (0.5 if timeframe == "1h" else 1.2)
        target = round(price * multiplier, 4)
        band = price * (0.012 if timeframe == "1h" else 0.028)

        if abs(change) < 0.3:
            direction = "neutral"
            confidence = random.randint(45, 60)
        elif change > 0:
            direction = "bullish"
            confidence = random.randint(55, 75)
        else:
            direction = "bearish"
            confidence = random.randint(50, 70)

        payload = {
            "target_price": target,
            "range_low": round(target - band, 4),
            "range_high": round(target + band, 4),
            "confidence_pct": confidence,
            "direction": direction,
            "reasoning": (
                f"{symbol} shows {'positive' if change > 0 else 'negative'} short-term "
                f"momentum with a {abs(change):.2f}% move in the last hour. "
                f"Volume and market structure suggest continuation within the projected range."
            ),
            "key_factors": [
                f"1h price change of {change:+.2f}% indicates short-term momentum",
                f"Current price ${price:,.2f} relative to 24h range provides context",
                f"Market cap and volume ratio suggest {'healthy' if confidence > 60 else 'moderate'} liquidity",
            ],
            "risk_factors": [
                "Broader market correlation could override token-specific signals",
                "Low timeframe predictions are inherently volatile and less reliable",
            ],
        }

        return PredictionResult(
            payload=payload,
            receipt_id=f"mock-{uuid.uuid4().hex[:16]}",
            tee_signature=None,
            transaction_hash=None,
            model="mock/heuristic-v1",
            settlement_mode="MOCK",
        )
