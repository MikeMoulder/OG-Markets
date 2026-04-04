"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fetchPredictions, fetchTokens } from "@/lib/api";
import PredictionHistory from "@/components/PredictionHistory";
import { cn, formatPct, formatPrice, formatUSD, pctColor } from "@/lib/utils";

export default function HomePage() {
  const { data: tokenData, isLoading: tokensLoading } = useQuery({
    queryKey: ["tokens"],
    queryFn: fetchTokens,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["predictions", "home"],
    queryFn: () => fetchPredictions({ limit: 5 }),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const tokens = tokenData?.tokens ?? [];
  const predictions = historyData?.predictions ?? [];
  const featuredTokens = [...tokens]
    .sort((a, b) => (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0))
    .slice(0, 4);
  const trackedCap = tokens.reduce(
    (sum, token) => sum + (token.market_cap_usd ?? 0),
    0
  );
  const latestPrediction = predictions[0];

  return (
    <div className="pb-12 pt-8">
      <section className="app-shell space-y-6">
        {/* Hero */}
        <div className="panel rounded-lg px-6 py-8 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="section-label">Verifiable AI predictions</span>
              <h1 className="mt-4 max-w-2xl font-mono text-3xl font-bold tracking-tight sm:text-4xl">
                Crypto forecasts you can verify, not just trust.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-txt-secondary">
                OG Markets uses AI models running inside TEEs (Trusted Execution
                Environments) to generate crypto price predictions. Every forecast
                comes with cryptographic proof from OpenGradient&mdash;so you can
                independently verify the model, inputs, and output.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/markets" className="button-primary">
                  Browse markets
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/lab" className="button-secondary">
                  How it works
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="stat-cell rounded-lg">
                  <p className="stat-label">Tokens tracked</p>
                  <p className="stat-value">{tokens.length || "--"}</p>
                </div>
                <div className="stat-cell rounded-lg">
                  <p className="stat-label">Total market cap</p>
                  <p className="stat-value">
                    {trackedCap ? formatUSD(trackedCap) : "--"}
                  </p>
                </div>
                <div className="stat-cell rounded-lg">
                  <p className="stat-label">Predictions made</p>
                  <p className="stat-value">{predictions.length || "--"}</p>
                </div>
              </div>
            </div>

            {/* Sidebar snapshot */}
            <div className="rounded-lg border border-border bg-bg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Market snapshot</p>
                  <h2 className="mt-1 font-mono text-lg font-semibold text-txt-primary">
                    Top assets
                  </h2>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {tokensLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-border px-1 py-2.5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-4 w-10" />
                        <div className="skeleton h-3 w-16" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-3 w-14" />
                        <div className="skeleton h-3 w-12" />
                      </div>
                    </div>
                  ))
                ) : featuredTokens.length ? (
                  featuredTokens.map((token) => (
                    <div
                      key={token.symbol}
                      className="flex items-center justify-between border-b border-border px-1 py-2.5 last:border-0"
                    >
                      <div>
                        <span className="font-mono text-sm font-semibold text-txt-primary">
                          {token.symbol}
                        </span>
                        <span className="ml-2 text-xs text-txt-tertiary">
                          {token.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs text-txt-secondary">
                          ${formatPrice(token.price_usd)}
                        </span>
                        <span
                          className={cn(
                            "ml-2 font-mono text-xs",
                            pctColor(token.change_24h_pct)
                          )}
                        >
                          {formatPct(token.change_24h_pct)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-xs text-txt-tertiary">
                    No data available
                  </p>
                )}
              </div>

              {latestPrediction ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="stat-label">Latest prediction</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-lg font-semibold text-txt-primary">
                      {latestPrediction.symbol}
                    </span>
                    <span
                      className={cn(
                        "direction-pill",
                        latestPrediction.direction
                      )}
                    >
                      {latestPrediction.direction}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-txt-secondary">
                    Target ${formatPrice(latestPrediction.target_price)} at{" "}
                    {latestPrediction.confidence_pct}% confidence
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="panel rounded-lg p-5">
            <PredictionHistory
              predictions={predictions}
              title="Recent predictions"
            />
          </div>

          <div className="space-y-4">
            <div className="panel rounded-lg p-5">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
                What is this?
              </h3>
              <p className="mt-3 text-xs leading-5 text-txt-secondary">
                OG Markets generates short-term price forecasts using AI models
                executed inside Trusted Execution Environments. Each prediction
                includes a verifiable proof from the OpenGradient network, giving
                you a transparent audit trail from input data to output signal.
              </p>
            </div>

            <div className="panel rounded-lg p-5">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
                Quick links
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/markets" className="button-secondary text-xs">
                  Live markets
                </Link>
                <Link href="/lab" className="button-secondary text-xs">
                  Forecast archive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
