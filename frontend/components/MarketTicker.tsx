"use client";

import type { TokenPrice } from "@/lib/types";
import { cn, formatPct, formatPrice, pctColor } from "@/lib/utils";

export default function MarketTicker({ tokens }: { tokens: TokenPrice[] }) {
  if (!tokens.length) return null;

  const items = [...tokens, ...tokens];

  return (
    <div className="ticker-rail">
      <div className="ticker-track py-1.5">
        {items.map((token, index) => (
          <div
            key={`${token.symbol}-${index}`}
            className="flex min-w-max items-center gap-2 border-r border-border px-4"
          >
            <span className="font-mono text-xs font-semibold text-txt-primary">
              {token.symbol}
            </span>
            <span className="font-mono text-[10px] text-txt-tertiary">
              ${formatPrice(token.price_usd)}
            </span>
            <span
              className={cn(
                "font-mono text-[10px] font-semibold",
                pctColor(token.change_24h_pct)
              )}
            >
              {formatPct(token.change_24h_pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
