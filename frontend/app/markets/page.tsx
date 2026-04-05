"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPredictionsSmart, fetchTokensSmart } from "@/lib/api";
import type { Timeframe } from "@/lib/types";
import PredictionHistory from "@/components/PredictionHistory";
import TimeframeSelector from "@/components/TimeframeSelector";
import TokenGrid from "@/components/TokenGrid";
import { cn, formatPct, formatUSD, pctColor } from "@/lib/utils";

export default function MarketsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const queryClient = useQueryClient();

  const { data: tokenData } = useQuery({
    queryKey: ["tokens"],
    queryFn: () =>
      fetchTokensSmart({
        onFreshData: (fresh) => queryClient.setQueryData(["tokens"], fresh),
      }),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["predictions", "markets"],
    queryFn: () =>
      fetchPredictionsSmart(
        { limit: 6 },
        {
          cacheNamespace: "markets",
          onFreshData: (fresh) =>
            queryClient.setQueryData(["predictions", "markets"], fresh),
        }
      ),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const tokens = tokenData?.tokens ?? [];
  const predictions = historyData?.predictions ?? [];
  const boardTokens = [...tokens].sort(
    (a, b) => (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0)
  );

  const topVolume = [...tokens].sort(
    (a, b) => (b.volume_24h_usd ?? 0) - (a.volume_24h_usd ?? 0)
  )[0];
  const topMover = [...tokens]
    .filter((token) => token.change_24h_pct != null)
    .sort(
      (a, b) =>
        Math.abs(b.change_24h_pct ?? 0) - Math.abs(a.change_24h_pct ?? 0)
    )[0];

  return (
    <div className="pb-12 pt-8">
      <section className="app-shell space-y-6">
        <div className="panel rounded-lg px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-label">Live markets</span>
              <h1 className="mt-3 font-mono text-2xl font-bold tracking-tight text-txt-primary sm:text-3xl">
                Pick an asset and run a verifiable forecast.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-txt-secondary">
                Select a timeframe and click any token to trigger an AI prediction.
                Every result comes with TEE proof metadata from OpenGradient.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <TimeframeSelector value={timeframe} onChange={setTimeframe} />
              <p className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                Auto-refreshes every 30s
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="stat-cell rounded-lg">
              <p className="stat-label">Coverage</p>
              <p className="stat-value">{tokens.length || "--"}</p>
            </div>
            <div className="stat-cell rounded-lg">
              <p className="stat-label">Highest volume</p>
              <p className="stat-value">{topVolume?.symbol ?? "--"}</p>
              <p className="mt-0.5 font-mono text-[10px] text-txt-tertiary">
                {topVolume?.volume_24h_usd
                  ? formatUSD(topVolume.volume_24h_usd)
                  : ""}
              </p>
            </div>
            <div className="stat-cell rounded-lg">
              <p className="stat-label">Biggest mover</p>
              <p className="stat-value">{topMover?.symbol ?? "--"}</p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-[10px]",
                  pctColor(topMover?.change_24h_pct)
                )}
              >
                {formatPct(topMover?.change_24h_pct)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <TokenGrid tokens={boardTokens} timeframe={timeframe} />

          <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">
            <div className="panel rounded-lg p-5">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
                How it works
              </h2>
              <p className="mt-3 text-xs leading-5 text-txt-secondary">
                Click any token card to generate a forecast. The AI model runs inside
                a TEE (Trusted Execution Environment) and the result is packaged
                with a cryptographic proof you can inspect.
              </p>
            </div>

            <div className="panel rounded-lg p-5">
              <PredictionHistory
                predictions={predictions}
                title="Recent calls"
                compact
              />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
