import type {
  TokenListResponse,
  PricesResponse,
  PredictionResponse,
  PredictionListResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api-rex-backend.ddnsfree.com"
    : "http://localhost:8000");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

type BrowserCacheEntry<T> = {
  value: T;
  savedAt: number;
};

type SmartFetchOptions<T> = {
  cacheKey: string;
  fetchCached: () => Promise<T>;
  fetchFresh: () => Promise<T>;
  onFreshData?: (data: T) => void;
};

function readBrowserCache<T>(cacheKey: string): T | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as BrowserCacheEntry<T>;
    return parsed.value;
  } catch {
    return undefined;
  }
}

function writeBrowserCache<T>(cacheKey: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    const payload: BrowserCacheEntry<T> = { value, savedAt: Date.now() };
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and continue using in-memory query cache.
  }
}

function withFreshQuery(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_fresh=${Date.now()}`;
}

async function smartCachedFetch<T>({
  cacheKey,
  fetchCached,
  fetchFresh,
  onFreshData,
}: SmartFetchOptions<T>): Promise<T> {
  const browserCached = readBrowserCache<T>(cacheKey);

  if (browserCached !== undefined) {
    void fetchFresh()
      .then((fresh) => {
        writeBrowserCache(cacheKey, fresh);
        onFreshData?.(fresh);
      })
      .catch(() => {
        // Keep serving cached data if background refresh fails.
      });

    return browserCached;
  }

  const backendCached = await fetchCached();
  writeBrowserCache(cacheKey, backendCached);

  void fetchFresh()
    .then((fresh) => {
      writeBrowserCache(cacheKey, fresh);
      onFreshData?.(fresh);
    })
    .catch(() => {
      // Keep initial backend data if background refresh fails.
    });

  return backendCached;
}

async function fetchTokensCached(): Promise<TokenListResponse> {
  return apiFetch("/api/tokens");
}

async function fetchTokensFresh(): Promise<TokenListResponse> {
  return apiFetch(withFreshQuery("/api/tokens"), {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
}

async function fetchPredictionsCached(params?: {
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

async function fetchPredictionsFresh(params?: {
  symbol?: string;
  timeframe?: string;
  limit?: number;
}): Promise<PredictionListResponse> {
  const query = new URLSearchParams();
  if (params?.symbol) query.set("symbol", params.symbol);
  if (params?.timeframe) query.set("timeframe", params.timeframe);
  if (params?.limit) query.set("limit", String(params.limit));
  query.set("_fresh", String(Date.now()));
  const qs = query.toString();
  return apiFetch(`/api/predictions${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
}

export function fetchTokens(): Promise<TokenListResponse> {
  return fetchTokensCached();
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
  return fetchPredictionsCached(params);
}

export function fetchTokensSmart(options?: {
  onFreshData?: (data: TokenListResponse) => void;
}): Promise<TokenListResponse> {
  return smartCachedFetch({
    cacheKey: "ogm:tokens",
    fetchCached: fetchTokensCached,
    fetchFresh: fetchTokensFresh,
    onFreshData: options?.onFreshData,
  });
}

export function fetchPredictionsSmart(
  params?: {
    symbol?: string;
    timeframe?: string;
    limit?: number;
  },
  options?: {
    onFreshData?: (data: PredictionListResponse) => void;
    cacheNamespace?: string;
  }
): Promise<PredictionListResponse> {
  const cacheNamespace = options?.cacheNamespace ?? "default";
  const paramsKey = JSON.stringify(params ?? {});

  return smartCachedFetch({
    cacheKey: `ogm:predictions:${cacheNamespace}:${paramsKey}`,
    fetchCached: () => fetchPredictionsCached(params),
    fetchFresh: () => fetchPredictionsFresh(params),
    onFreshData: options?.onFreshData,
  });
}
