from __future__ import annotations

from cachetools import TTLCache

from .config import settings

# Price cache: keyed by "all_prices", stores the full price dict
price_cache: TTLCache = TTLCache(maxsize=64, ttl=settings.price_refresh_seconds)

# Prediction cache: keyed by "symbol:timeframe", stores PredictionResponse
prediction_cache: TTLCache = TTLCache(maxsize=256, ttl=settings.prediction_cache_ttl)
