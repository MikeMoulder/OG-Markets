"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { PredictionResponse } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import ConfidenceGauge from "./ConfidenceGauge";
import PriceRangeBand from "./PriceRangeBand";
import ProofDrawer from "./ProofDrawer";

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  },
};

const directionConfig = {
  bullish: { icon: TrendingUp, label: "Bullish" },
  bearish: { icon: TrendingDown, label: "Bearish" },
  neutral: { icon: Minus, label: "Neutral" },
};

export default function PredictionCard({
  data,
}: {
  data: PredictionResponse;
}) {
  const { prediction, proof } = data;
  const direction = directionConfig[prediction.direction];
  const DirectionIcon = direction.icon;

  const deltaPct =
    prediction.current_price > 0
      ? ((prediction.target_price - prediction.current_price) /
          prediction.current_price) *
        100
      : 0;
  const rangeSpan = prediction.range_high - prediction.range_low;

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Main forecast panel */}
      <motion.section
        variants={stagger.item}
        className="panel rounded-lg p-5 sm:p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-label">Forecast result</span>
              <span className={cn("direction-pill", prediction.direction)}>
                <DirectionIcon className="h-3 w-3" />
                {direction.label}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <h2 className="font-mono text-4xl font-bold tracking-tight text-txt-primary">
                {prediction.symbol}
              </h2>
              <p className="pb-1 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary">
                {prediction.timeframe} horizon
              </p>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-txt-secondary">
              The model predicts a {direction.label.toLowerCase()} move from $
              {formatPrice(prediction.current_price)} toward $
              {formatPrice(prediction.target_price)}.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Current</p>
                <p className="stat-value">
                  ${formatPrice(prediction.current_price)}
                </p>
              </div>
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Target</p>
                <p className="stat-value">
                  ${formatPrice(prediction.target_price)}
                </p>
              </div>
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Expected move</p>
                <p
                  className={cn(
                    "stat-value",
                    deltaPct >= 0 ? "text-bullish" : "text-bearish"
                  )}
                >
                  {deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="stat-label">Confidence</p>
              <div className="mt-3">
                <ConfidenceGauge value={prediction.confidence_pct} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="stat-label">Range width</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-txt-primary">
                ${formatPrice(rangeSpan)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-txt-tertiary">
                ${formatPrice(prediction.range_low)} &ndash; ${formatPrice(prediction.range_high)}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Range + Analysis */}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          variants={stagger.item}
          className="panel rounded-lg p-5"
        >
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
            Range map
          </h3>
          <p className="mt-2 text-xs text-txt-secondary">
            Target price within the predicted confidence envelope.
          </p>
          <div className="mt-4">
            <PriceRangeBand
              low={prediction.range_low}
              high={prediction.range_high}
              target={prediction.target_price}
              current={prediction.current_price}
            />
          </div>
        </motion.section>

        <motion.section
          variants={stagger.item}
          className="panel rounded-lg p-5"
        >
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
            Analysis
          </h3>
          <p className="mt-3 text-xs leading-5 text-txt-secondary">
            {prediction.reasoning}
          </p>
        </motion.section>
      </div>

      {/* Factors */}
      <div className="grid gap-4 xl:grid-cols-2">
        <motion.section
          variants={stagger.item}
          className="panel rounded-lg p-5"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-bullish" />
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
              Key factors
            </h3>
          </div>
          <div className="mt-4 space-y-2">
            {prediction.key_factors.map((factor, index) => (
              <div
                key={index}
                className="rounded-md border border-border bg-bg px-3 py-2.5 text-xs leading-5 text-txt-secondary"
              >
                {factor}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={stagger.item}
          className="panel rounded-lg p-5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-bearish" />
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
              Risk factors
            </h3>
          </div>
          <div className="mt-4 space-y-2">
            {prediction.risk_factors.map((factor, index) => (
              <div
                key={index}
                className="rounded-md border border-border bg-bg px-3 py-2.5 text-xs leading-5 text-txt-secondary"
              >
                {factor}
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.div variants={stagger.item}>
        <ProofDrawer proof={proof} />
      </motion.div>

      <motion.p
        variants={stagger.item}
        className="text-center font-mono text-[10px] tracking-wider text-txt-muted"
      >
        {data.disclaimer}
      </motion.p>
    </motion.div>
  );
}
