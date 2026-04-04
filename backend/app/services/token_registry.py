from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Token

CURATED_TOKENS: list[dict] = [
    {"symbol": "BTC", "name": "Bitcoin", "coingecko_id": "bitcoin", "rank": 1},
    {"symbol": "ETH", "name": "Ethereum", "coingecko_id": "ethereum", "rank": 2},
    {"symbol": "SOL", "name": "Solana", "coingecko_id": "solana", "rank": 3},
    {"symbol": "ARB", "name": "Arbitrum", "coingecko_id": "arbitrum", "rank": 4},
    {"symbol": "AVAX", "name": "Avalanche", "coingecko_id": "avalanche-2", "rank": 5},
    {"symbol": "LINK", "name": "Chainlink", "coingecko_id": "chainlink", "rank": 6},
    {"symbol": "SUI", "name": "Sui", "coingecko_id": "sui", "rank": 7},
    {"symbol": "DOT", "name": "Polkadot", "coingecko_id": "polkadot", "rank": 8},
    {"symbol": "ATOM", "name": "Cosmos", "coingecko_id": "cosmos", "rank": 9},
    {"symbol": "UNI", "name": "Uniswap", "coingecko_id": "uniswap", "rank": 10},
    {"symbol": "AAVE", "name": "Aave", "coingecko_id": "aave", "rank": 11},
    {"symbol": "OP", "name": "Optimism", "coingecko_id": "optimism", "rank": 12},
]

COINGECKO_IDS = ",".join(t["coingecko_id"] for t in CURATED_TOKENS)
SYMBOL_TO_CG_ID = {t["symbol"]: t["coingecko_id"] for t in CURATED_TOKENS}
CG_ID_TO_SYMBOL = {t["coingecko_id"]: t["symbol"] for t in CURATED_TOKENS}


async def seed_tokens(db: AsyncSession) -> None:
    result = await db.execute(select(Token).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # Already seeded

    for t in CURATED_TOKENS:
        db.add(Token(**t))
    await db.commit()
