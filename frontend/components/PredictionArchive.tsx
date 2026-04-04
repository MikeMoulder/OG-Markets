"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { PredictionData } from "@/lib/types";
import { clipText, cn, formatPrice } from "@/lib/utils";

const directionIcon = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
};

export default function PredictionArchive({
  predictions,
}: {
  predictions: PredictionData[];
}) {
  if (!predictions.length) {
    return (
      <div className="panel rounded-lg p-5 text-xs text-txt-tertiary">
        No forecasts yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {predictions.map((prediction, index) => {
        const Icon = directionIcon[prediction.direction];
        const delta =
          prediction.current_price > 0
            ? ((prediction.target_price - prediction.current_price) /
                prediction.current_price) *
              100
            : 0;

        return (
          <Link
            key={prediction.id}
            href={`/predict?symbol=${prediction.symbol}&timeframe=${prediction.timeframe}`}
            className="group block"
          >
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              className="data-card data-card-hover h-full rounded-lg p-4"
            >
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-txt-primary">
                        {prediction.symbol}
                      </span>
                      <span
                        className={cn("direction-pill", prediction.direction)}
                      >
                        <Icon className="h-3 w-3" />
                        {prediction.direction}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                      {prediction.timeframe} / {prediction.confidence_pct}% conf
                    </p>
                  </div>

                  <div className="rounded-md border border-border bg-bg p-1.5 text-txt-muted">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="stat-cell rounded-md">
                    <p className="stat-label">Current</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-txt-primary">
                      ${formatPrice(prediction.current_price)}
                    </p>
                  </div>
                  <div className="stat-cell rounded-md">
                    <p className="stat-label">Target</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-txt-primary">
                      ${formatPrice(prediction.target_price)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="stat-label">Note</p>
                  <p className="mt-1 text-xs leading-5 text-txt-secondary">
                    {clipText(prediction.reasoning, 140)}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      delta >= 0 ? "text-bullish" : "text-bearish"
                    )}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(2)}%
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary group-hover:text-txt-secondary">
                    Open
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </motion.article>
          </Link>
        );
      })}
    </div>
  );
}
