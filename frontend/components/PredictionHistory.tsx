"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { PredictionData } from "@/lib/types";
import { clipText, cn, formatPrice } from "@/lib/utils";

const directionIcon = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
};

export default function PredictionHistory({
  predictions,
  title = "Recent signals",
  compact = false,
}: {
  predictions: PredictionData[];
  title?: string;
  compact?: boolean;
}) {
  if (!predictions.length) {
    return (
      <p className="text-xs text-txt-tertiary">
        No predictions yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="section-label">Signal feed</p>
        <h2
          className={cn(
            "mt-2 font-mono font-semibold text-txt-primary",
            compact ? "text-sm" : "text-base"
          )}
        >
          {title}
        </h2>
      </div>

      <div className="space-y-2">
        {predictions.map((prediction, index) => {
          const Icon = directionIcon[prediction.direction];

          return (
            <Link
              key={prediction.id}
              href={`/predict?symbol=${prediction.symbol}&timeframe=${prediction.timeframe}`}
              className="group block"
            >
              <motion.article
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="data-card data-card-hover rounded-lg p-3"
              >
                <div
                  className={cn(
                    "flex flex-col gap-3",
                    compact ? "" : "sm:flex-row sm:items-center sm:justify-between"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-txt-primary">
                        {prediction.symbol}
                      </span>
                      <span
                        className={cn("direction-pill", prediction.direction)}
                      >
                        <Icon className="h-3 w-3" />
                        {prediction.direction}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                        <Clock3 className="h-3 w-3" />
                        {prediction.timeframe}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-txt-secondary">
                      {clipText(prediction.reasoning, compact ? 80 : 120)}
                    </p>
                  </div>

                  {compact ? (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary">
                      <span>
                        Target{" "}
                        <span className="text-txt-secondary">
                          ${formatPrice(prediction.target_price)}
                        </span>
                      </span>
                      <span>
                        Conf{" "}
                        <span className="text-txt-secondary">
                          {prediction.confidence_pct}%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:w-[16rem]">
                      <div className="stat-cell rounded-md">
                        <p className="stat-label">Target</p>
                        <p className="mt-1 font-mono text-xs font-semibold text-txt-primary">
                          ${formatPrice(prediction.target_price)}
                        </p>
                      </div>
                      <div className="stat-cell rounded-md">
                        <p className="stat-label">Confidence</p>
                        <p className="mt-1 font-mono text-xs font-semibold text-txt-primary">
                          {prediction.confidence_pct}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
