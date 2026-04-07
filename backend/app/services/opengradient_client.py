from __future__ import annotations

import asyncio
import enum
import inspect
import json
import logging
import random
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
import httpx

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

    MODEL_ENUM_MAP = {
        "openai/gpt-4.1-2025-04-14": "GPT_4_1_2025_04_14",
        "openai/gpt-4o": "GPT_4O",
        "openai/o4-mini": "O4_MINI",
        "anthropic/claude-4.0-sonnet": "CLAUDE_4_0_SONNET",
        "anthropic/claude-sonnet-4-6": "CLAUDE_SONNET_4_6",
        "google/gemini-2.5-pro": "GEMINI_2_5_PRO",
        "google/gemini-2.5-flash": "GEMINI_2_5_FLASH",
    }

    SETTLEMENT_ALIASES = {
        "SETTLE_BATCH": "BATCH_HASHED",
        "SETTLE_METADATA": "INDIVIDUAL_FULL",
        "SETTLE": "INDIVIDUAL_FULL",
    }

    def __init__(self) -> None:
        self.enabled = settings.opengradient_enabled
        self.allow_mock = settings.allow_mock_opengradient

    @staticmethod
    def _ensure_strenum_compat() -> None:
        if hasattr(enum, "StrEnum"):
            return

        class _CompatStrEnum(str, enum.Enum):
            pass

        enum.StrEnum = _CompatStrEnum  # type: ignore[attr-defined]

    # ── SDK resolution helpers ────────────────────────────────────────

    def _resolve_model(self, og: Any) -> Any:
        requested = settings.opengradient_model.strip()
        model_attr = self.MODEL_ENUM_MAP.get(requested, requested)

        if "/" in model_attr:
            model_attr = model_attr.split("/")[-1]
        model_attr = model_attr.replace("-", "_").replace(".", "_").upper()

        if hasattr(og.TEE_LLM, model_attr):
            return getattr(og.TEE_LLM, model_attr)

        # Fallback chain
        for fallback in ("GPT_4_1_2025_04_14", "CLAUDE_4_0_SONNET", "GPT_4O"):
            if hasattr(og.TEE_LLM, fallback):
                logger.warning(
                    "Model enum %s not found on og.TEE_LLM, falling back to %s",
                    model_attr,
                    fallback,
                )
                return getattr(og.TEE_LLM, fallback)

        raise ValueError(f"No compatible TEE_LLM model enum found in opengradient SDK (tried {model_attr})")

    def _resolve_settlement(self, og: Any) -> Any:
        mode_name = settings.opengradient_settlement_mode.upper().strip()

        candidates = [mode_name]
        if mode_name in self.SETTLEMENT_ALIASES:
            candidates.append(self.SETTLEMENT_ALIASES[mode_name])

        for candidate in candidates:
            if hasattr(og.x402SettlementMode, candidate):
                return getattr(og.x402SettlementMode, candidate)

        # Fallback chain
        for fallback in ("BATCH_HASHED", "SETTLE_BATCH"):
            if hasattr(og.x402SettlementMode, fallback):
                logger.warning(
                    "Settlement mode %s not found, falling back to %s",
                    mode_name,
                    fallback,
                )
                return getattr(og.x402SettlementMode, fallback)

        raise ValueError(f"No compatible x402 settlement mode enum found (tried {mode_name})")

    def _fallback_settlement_modes(self, og: Any, primary_mode: Any) -> list[Any]:
        candidates: list[Any] = []

        # Try PRIVATE mode
        for name in ("PRIVATE", "SETTLE_PRIVATE"):
            if hasattr(og.x402SettlementMode, name):
                mode = getattr(og.x402SettlementMode, name)
                if mode != primary_mode:
                    candidates.append(mode)
                break

        # Try individual settlement modes
        for name in ("SETTLE", "INDIVIDUAL_FULL", "SETTLE_METADATA"):
            if hasattr(og.x402SettlementMode, name):
                mode = getattr(og.x402SettlementMode, name)
                if mode != primary_mode and mode not in candidates:
                    candidates.append(mode)

        return candidates

    # ── Approval ──────────────────────────────────────────────────────

    def _ensure_approval(self, client: Any) -> None:
        if PredictionClient._approval_done:
            return

        ensure_fn = getattr(client, "ensure_opg_approval", None)
        if not callable(ensure_fn):
            return

        try:
            # Use opg_amount (the param name the SDK expects)
            ensure_fn(opg_amount=settings.opengradient_approval_amount)
            PredictionClient._approval_done = True
        except Exception as e:
            logger.warning("OPG approval failed: %s", e)

    # ── Receipt extraction ────────────────────────────────────────────

    @staticmethod
    def _extract_receipt(result: Any) -> str:
        candidates = [
            "payment_hash",
            "x402_payment_hash",
            "receipt_id",
            "settlement_hash",
            "transaction_hash",
            "tx_hash",
        ]
        for field in candidates:
            val = getattr(result, field, None)
            if val:
                return str(val)

        if isinstance(result, dict):
            for field in candidates:
                val = result.get(field)
                if val:
                    return str(val)

        return f"unknown-{uuid.uuid4().hex[:12]}"

    # ── Chat content extraction ───────────────────────────────────────

    @staticmethod
    def _extract_chat_content(response: Any) -> str | None:
        # object.chat_output.content
        chat_output = getattr(response, "chat_output", None)
        if isinstance(chat_output, dict) and "content" in chat_output:
            return chat_output["content"]

        # dict response
        if isinstance(response, dict):
            co = response.get("chat_output") or {}
            if isinstance(co, dict) and "content" in co:
                return co["content"]
            if "content" in response:
                return response["content"]

        # choices-based response
        choices = getattr(response, "choices", None)
        if isinstance(choices, list) and choices:
            first = choices[0]
            message = getattr(first, "message", None)
            if message is not None:
                content = getattr(message, "content", None)
                if content:
                    return content
            if isinstance(first, dict):
                msg = first.get("message") or {}
                if isinstance(msg, dict) and msg.get("content"):
                    return msg["content"]

        # completion_output fallback
        if hasattr(response, "completion_output"):
            return getattr(response, "completion_output")

        return None

    # ── Async helper ──────────────────────────────────────────────────

    @staticmethod
    async def _resolve_maybe_async(result: Any) -> Any:
        if inspect.isawaitable(result):
            return await result
        return result

    @staticmethod
    def _is_payment_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return "402" in message or "payment required" in message

    @staticmethod
    def _parse_prediction_payload(raw_content: Any) -> dict:
        if isinstance(raw_content, str):
            cleaned = raw_content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()
        else:
            cleaned = raw_content

        try:
            if isinstance(cleaned, dict):
                return cleaned
            return json.loads(cleaned)
        except json.JSONDecodeError:
            if isinstance(cleaned, str):
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start >= 0 and end > start:
                    try:
                        return json.loads(cleaned[start : end + 1])
                    except json.JSONDecodeError as exc:
                        raise HTTPException(502, "Invalid prediction response from AI model") from exc

            raise HTTPException(502, "Invalid prediction response from AI model")

    async def _invoke_chat_with_retry_window(
        self,
        llm: Any,
        og: Any,
        messages: list[dict],
        settlement_mode: Any,
    ) -> Any:
        deadline = time.monotonic() + max(1, settings.opengradient_fallback_after_seconds)
        last_exc: Exception | None = None
        attempts = 0

        while time.monotonic() < deadline:
            attempts += 1
            remaining = max(0.2, deadline - time.monotonic())
            try:
                return await asyncio.wait_for(
                    self._invoke_chat(llm, og, messages, settlement_mode),
                    timeout=remaining,
                )
            except asyncio.TimeoutError:
                last_exc = RuntimeError("OpenGradient request timed out")
                break
            except Exception as exc:
                last_exc = exc
                if not self._is_payment_error(exc):
                    raise

                sleep_for = min(1.0, max(0.0, deadline - time.monotonic()))
                if sleep_for <= 0:
                    break

                logger.warning(
                    "OpenGradient payment error (attempt=%s), retrying within %ss window",
                    attempts,
                    settings.opengradient_fallback_after_seconds,
                )
                await asyncio.sleep(sleep_for)

        if last_exc is not None:
            raise last_exc

        raise RuntimeError("OpenGradient request failed within retry window")

    async def _predict_via_openrouter(self, messages: list[dict]) -> PredictionResult:
        if not settings.openrouter_enabled or not settings.openrouter_api_key:
            raise HTTPException(503, "OpenRouter fallback not configured")

        url = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": settings.openrouter_model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": 800,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=body)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(502, f"OpenRouter fallback request failed: {exc}") from exc
        except Exception as exc:
            raise HTTPException(502, f"OpenRouter fallback request failed: {exc}") from exc

        choices = data.get("choices") if isinstance(data, dict) else None
        if not isinstance(choices, list) or not choices:
            raise HTTPException(502, "OpenRouter fallback returned empty response")

        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not content:
            raise HTTPException(502, "OpenRouter fallback returned empty content")

        payload = self._parse_prediction_payload(content)

        return PredictionResult(
            payload=payload,
            receipt_id=f"fallback-{uuid.uuid4().hex[:16]}",
            tee_signature=None,
            transaction_hash="external",
            model=f"openrouter/{settings.openrouter_model}",
            settlement_mode="FALLBACK_OPENROUTER",
        )

    # ── Main predict method ───────────────────────────────────────────

    async def predict(
        self, symbol: str, timeframe: str, market_data: dict
    ) -> PredictionResult:
        if not self.enabled or not settings.opengradient_private_key:
            if self.allow_mock:
                return self._mock_prediction(symbol, timeframe, market_data)
            raise HTTPException(503, "OpenGradient not configured")

        try:
            self._ensure_strenum_compat()
            import opengradient as og
        except ImportError:
            if self.allow_mock:
                return self._mock_prediction(symbol, timeframe, market_data)
            raise HTTPException(503, "opengradient SDK not installed")

        llm = og.LLM(private_key=settings.opengradient_private_key)
        self._ensure_approval(llm)

        user_prompt = build_user_prompt(symbol, timeframe, market_data)
        messages = [
            {"role": "system", "content": PREDICTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        settlement_mode = self._resolve_settlement(og)
        settlement_mode_name = getattr(settlement_mode, "name", settings.opengradient_settlement_mode)

        try:
            result = await self._invoke_chat_with_retry_window(llm, og, messages, settlement_mode)
        except Exception as exc:
            exc_msg = str(exc)

            # Retry with fallback settlement modes on "event not found" errors
            if "event not found" in exc_msg.lower():
                result = None
                for retry_mode in self._fallback_settlement_modes(og, settlement_mode):
                    retry_name = getattr(retry_mode, "name", "unknown")
                    logger.warning(
                        "Settlement event not found with mode=%s, retrying with mode=%s",
                        settlement_mode_name,
                        retry_name,
                    )
                    try:
                        result = await self._invoke_chat_with_retry_window(llm, og, messages, retry_mode)
                        settlement_mode_name = retry_name
                        break
                    except Exception as retry_exc:
                        if "event not found" not in str(retry_exc).lower():
                            raise

                if result is not None:
                    pass  # fall through to parsing below
                else:
                    logger.warning("All settlement modes failed, attempting OpenRouter fallback")
                    try:
                        return await self._predict_via_openrouter(messages)
                    except HTTPException:
                        if self.allow_mock:
                            logger.warning("OpenRouter fallback unavailable; using mock prediction")
                            return self._mock_prediction(symbol, timeframe, market_data)
                        raise HTTPException(502, f"OpenGradient settlement failed: {exc_msg}")
            else:
                logger.exception("OpenGradient prediction request failed: %s", exc)
                if self._is_payment_error(exc) or "timed out" in exc_msg.lower():
                    logger.warning(
                        "OpenGradient unavailable (payment/timeout). Attempting OpenRouter fallback"
                    )
                    try:
                        return await self._predict_via_openrouter(messages)
                    except HTTPException:
                        if self.allow_mock:
                            logger.warning("OpenRouter fallback unavailable; using mock prediction")
                            return self._mock_prediction(symbol, timeframe, market_data)
                if self.allow_mock:
                    logger.warning("Falling back to mock prediction due to OpenGradient error")
                    return self._mock_prediction(symbol, timeframe, market_data)

                status_code = 503
                if "402" in exc_msg or "Payment Required" in exc_msg:
                    status_code = 402
                raise HTTPException(status_code, f"OpenGradient request failed: {exc_msg}")

        # Parse response
        raw_content = self._extract_chat_content(result)
        if raw_content is None:
            logger.error("Could not extract content from OpenGradient response: %s", type(result))
            raise HTTPException(502, "Empty response from AI model")

        try:
            payload = self._parse_prediction_payload(raw_content)
        except HTTPException:
            logger.error("Failed to parse LLM response:\n%s", raw_content)
            raise

        receipt_id = self._extract_receipt(result)

        return PredictionResult(
            payload=payload,
            receipt_id=receipt_id,
            tee_signature=getattr(result, "tee_signature", None),
            transaction_hash=getattr(result, "transaction_hash", None),
            model=settings.opengradient_model,
            settlement_mode=settlement_mode_name,
        )

    async def _invoke_chat(self, llm: Any, og: Any, messages: list[dict], settlement_mode: Any) -> Any:
        result = llm.chat(
            model=self._resolve_model(og),
            messages=messages,
            x402_settlement_mode=settlement_mode,
            temperature=0,
            max_tokens=800,
        )
        return await self._resolve_maybe_async(result)

    # ── Mock prediction ───────────────────────────────────────────────

    @staticmethod
    def _mock_prediction(symbol: str, timeframe: str, market_data: dict) -> PredictionResult:
        price = market_data.get("price_usd", 100.0) or 100.0
        change = market_data.get("change_1h_pct", 0.0) or 0.0

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
