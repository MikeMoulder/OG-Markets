import type {
  TokenListResponse,
  PricesResponse,
  PredictionResponse,
  PredictionListResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export function fetchTokens(): Promise<TokenListResponse> {
  return apiFetch("/api/tokens");
}

export function fetchPrices(): Promise<PricesResponse> {
  return apiFetch("/api/prices");
}

export function fetchPrediction(
  symbol: string,
  timeframe: string
): Promise<PredictionResponse> {
  return apiFetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, timeframe }),
  });
}

export function fetchPredictions(params?: {
  symbol?: string;
  timeframe?: string;
  limit?: number;
}): Promise<PredictionListResponse> {
  const query = new URLSearchParams();
  if (params?.symbol) query.set("symbol", params.symbol);
  if (params?.timeframe) query.set("timeframe", params.timeframe);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiFetch(`/api/predictions${qs ? `?${qs}` : ""}`);
}
