"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { TokenPrice, Timeframe } from "@/lib/types";
import { cn, formatPct, formatPrice, formatUSD, pctColor } from "@/lib/utils";

function Sparkline({
  data,
  color,
  symbol,
}: {
  data: number[];
  color: string;
  symbol: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 28;
  const gradientId = `spark-${symbol.toLowerCase()}`;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function TokenCard({
  token,
  timeframe,
  index,
}: {
  token: TokenPrice;
  timeframe: Timeframe;
  index: number;
}) {
  const displayChange =
    timeframe === "1h" ? token.change_1h_pct : token.change_24h_pct;
  const sparkColor =
    (displayChange ?? 0) >= 0
      ? "var(--color-bullish)"
      : "var(--color-bearish)";

  return (
    <Link
      href={`/predict?symbol=${token.symbol}&timeframe=${timeframe}`}
      className="group block"
    >
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: index * 0.03,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="data-card data-card-hover rounded-lg p-4"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-mono text-sm font-semibold text-txt-primary">
                {token.symbol}
              </h3>
              <p className="text-xs text-txt-tertiary">{token.name}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-mono text-xs font-semibold",
                  pctColor(displayChange)
                )}
              >
                {formatPct(displayChange)}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                {timeframe}
              </p>
            </div>
          </div>

          {token.sparkline_7d && token.sparkline_7d.length > 1 ? (
            <div className="px-1 py-1">
              <Sparkline
                data={token.sparkline_7d.slice(-48)}
                color={sparkColor}
                symbol={token.symbol}
              />
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
            <div>
              <p className="font-mono text-lg font-semibold text-txt-primary">
                ${formatPrice(token.price_usd)}
              </p>
              <p className="font-mono text-[10px] text-txt-tertiary">
                Vol {formatUSD(token.volume_24h_usd)} / Cap{" "}
                {formatUSD(token.market_cap_usd)}
              </p>
            </div>

            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary group-hover:text-txt-secondary">
              Predict
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
