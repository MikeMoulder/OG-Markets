"use client";

import type { TokenPrice, Timeframe } from "@/lib/types";
import TokenCard from "./TokenCard";

export default function TokenGrid({
  tokens,
  timeframe,
}: {
  tokens: TokenPrice[];
  timeframe: Timeframe;
}) {
  if (!tokens.length) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
            <div className="mt-5 h-8 w-28 rounded bg-white/5 animate-pulse" />
            <div className="mt-5 h-16 rounded bg-white/5 animate-pulse" />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="h-12 rounded bg-white/5 animate-pulse" />
              <div className="h-12 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tokens.map((token, index) => (
        <TokenCard
          key={token.symbol}
          token={token}
          timeframe={timeframe}
          index={index}
        />
      ))}
    </div>
  );
}
