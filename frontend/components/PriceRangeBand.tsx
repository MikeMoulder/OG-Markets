"use client";

import { formatPrice } from "@/lib/utils";

export default function PriceRangeBand({
  low,
  high,
  target,
  current,
}: {
  low: number;
  high: number;
  target: number;
  current: number;
}) {
  const range = high - low || 1;
  const targetPct = ((target - low) / range) * 100;
  const currentPct = ((current - low) / range) * 100;

  const clamp = (value: number) => Math.max(2, Math.min(98, value));
  const rising = target >= current;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-txt-muted">
        <span>${formatPrice(low)}</span>
        <span>${formatPrice(high)}</span>
      </div>

      <div className="rounded-md border border-border bg-bg p-4">
        <div className="relative h-4 overflow-hidden rounded-sm bg-elevated">
          <div
            className="absolute inset-y-0 left-0 right-0 rounded-sm opacity-25"
            style={{
              background:
                "linear-gradient(90deg, var(--color-bearish) 0%, var(--color-warning) 42%, var(--color-bullish) 100%)",
            }}
          />
          <div
            className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-txt-primary bg-surface"
            style={{ left: `${clamp(currentPct)}%`, marginLeft: "-7px" }}
          />
          <div
            className="absolute top-0 bottom-0 z-10 w-[2px] rounded-sm"
            style={{
              left: `${clamp(targetPct)}%`,
              marginLeft: "-1px",
              background: rising
                ? "var(--color-bullish)"
                : "var(--color-bearish)",
            }}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="stat-cell rounded-md">
            <p className="stat-label">Current</p>
            <p className="mt-1 font-mono text-xs text-txt-primary">
              ${formatPrice(current)}
            </p>
          </div>
          <div className="stat-cell rounded-md">
            <p className="stat-label">Target</p>
            <p className="mt-1 font-mono text-xs text-txt-primary">
              ${formatPrice(target)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
