from __future__ import annotations

import datetime

from sqlalchemy import Integer, Text, Float, Boolean, DateTime, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Token(Base):
    __tablename__ = "tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    coingecko_id: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank: Mapped[int] = mapped_column(Integer, default=999)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    __table_args__ = (
        Index("idx_price_symbol_time", "symbol", "fetched_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(Text, nullable=False)
    price_usd: Mapped[float] = mapped_column(Float, nullable=False)
    change_1h_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    change_24h_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    change_7d_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume_24h_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_cap_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    sparkline_7d: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    fetched_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        Index("idx_pred_symbol_time", "symbol", "created_at"),
        Index("idx_pred_timeframe", "timeframe", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(Text, nullable=False)
    timeframe: Mapped[str] = mapped_column(Text, nullable=False)
    current_price: Mapped[float] = mapped_column(Float, nullable=False)
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    range_low: Mapped[float] = mapped_column(Float, nullable=False)
    range_high: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    key_factors: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    risk_factors: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    model_used: Mapped[str] = mapped_column(Text, nullable=False)
    settlement_mode: Mapped[str] = mapped_column(Text, nullable=False)
    receipt_id: Mapped[str] = mapped_column(Text, nullable=False)
    tee_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
