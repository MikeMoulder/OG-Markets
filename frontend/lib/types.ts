// --- Token / Price ---

export interface TokenPrice {
  symbol: string;
  name: string;
  price_usd: number | null;
  change_1h_pct: number | null;
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  volume_24h_usd: number | null;
  market_cap_usd: number | null;
  high_24h: number | null;
  low_24h: number | null;
  sparkline_7d: number[] | null;
  last_updated: string | null;
}

export interface TokenListResponse {
  tokens: TokenPrice[];
}

export interface PricesResponse {
  prices: Record<string, { price_usd: number; change_1h_pct: number; change_24h_pct: number }>;
  updated_at: string | null;
}

// --- Prediction ---

export interface PredictionData {
  id: number;
  symbol: string;
  timeframe: string;
  current_price: number;
  target_price: number;
  range_low: number;
  range_high: number;
  confidence_pct: number;
  direction: "bullish" | "bearish" | "neutral";
  reasoning: string;
  key_factors: string[];
  risk_factors: string[];
  created_at: string;
}

export interface ProofBundle {
  model: string;
  settlement_mode: string;
  receipt_id: string;
  tee_signature: string | null;
  transaction_hash: string | null;
}

export interface PredictionResponse {
  prediction: PredictionData;
  proof: ProofBundle;
  disclaimer: string;
}

export interface PredictionListResponse {
  predictions: PredictionData[];
  total: number;
}

export type Timeframe = "1h" | "4h";
