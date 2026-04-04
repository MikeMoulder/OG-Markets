"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchPrediction } from "@/lib/api";
import type { PredictionResponse } from "@/lib/types";
import PredictionCard from "@/components/PredictionCard";

function PredictContent() {
  const searchParams = useSearchParams();

  const symbol = searchParams.get("symbol")?.toUpperCase() || "";
  const timeframe = searchParams.get("timeframe") || "1h";

  const { mutate, data, isPending, isError, error } = useMutation<
    PredictionResponse,
    Error
  >({
    mutationFn: () => fetchPrediction(symbol, timeframe),
  });

  useEffect(() => {
    if (symbol && !data && !isPending) {
      mutate();
    }
  }, [data, isPending, mutate, symbol, timeframe]);

  if (!symbol) {
    return (
      <div className="app-shell py-14">
        <div className="panel rounded-lg p-8 text-center">
          <p className="font-mono text-xl font-semibold text-txt-primary">
            No token selected
          </p>
          <p className="mt-3 text-xs text-txt-secondary">
            Go to the markets page and click a token to generate a forecast.
          </p>
          <Link href="/markets" className="button-primary mt-5 inline-flex">
            <ArrowLeft className="h-3.5 w-3.5" />
            Markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell py-8">
      <section className="panel rounded-lg px-6 py-6 sm:px-8">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-txt-tertiary hover:text-txt-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Markets
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label">Forecast</span>
            <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight text-txt-primary sm:text-4xl">
              {symbol}
            </h1>
            <p className="mt-2 text-sm text-txt-secondary">
              {timeframe} prediction with verifiable TEE proof.
            </p>
          </div>

          <span className="inline-flex items-center rounded-md border border-border bg-bg px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary">
            {timeframe}
          </span>
        </div>
      </section>

      {isPending ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="panel mt-5 rounded-lg px-6 py-12 text-center"
        >
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-txt-tertiary" />
          <p className="mt-4 font-mono text-sm font-semibold text-txt-primary">
            Running model in TEE...
          </p>
          <p className="mt-2 text-xs text-txt-secondary">
            Generating forecast and packaging proof metadata.
          </p>
        </motion.div>
      ) : null}

      {isError ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel mt-5 rounded-lg px-6 py-10 text-center"
        >
          <p className="font-mono text-sm font-semibold text-bearish">
            Prediction failed
          </p>
          <p className="mt-2 text-xs text-txt-secondary">{error.message}</p>
          <button onClick={() => mutate()} className="button-primary mt-5">
            Retry
          </button>
        </motion.div>
      ) : null}

      {data ? (
        <div className="mt-5">
          <PredictionCard data={data} />
        </div>
      ) : null}
    </div>
  );
}

export default function PredictPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell py-14">
          <div className="panel rounded-lg px-6 py-12 text-center text-xs text-txt-tertiary">
            Loading...
          </div>
        </div>
      }
    >
      <PredictContent />
    </Suspense>
  );
}
