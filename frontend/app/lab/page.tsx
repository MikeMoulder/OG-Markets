"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, ShieldCheck, WavesLadder } from "lucide-react";
import { fetchPredictions, fetchTokens } from "@/lib/api";
import PredictionArchive from "@/components/PredictionArchive";

const labPanels = [
  {
    title: "Context",
    description:
      "Live price data, volume, and market indicators are pulled in before each forecast run.",
    icon: WavesLadder,
  },
  {
    title: "Inference",
    description:
      "An AI model running inside a TEE produces a direction, target price, range, and confidence score.",
    icon: BrainCircuit,
  },
  {
    title: "Proof",
    description:
      "OpenGradient attaches a cryptographic receipt and optional on-chain settlement to every prediction.",
    icon: ShieldCheck,
  },
];

export default function LabPage() {
  const { data: tokenData } = useQuery({
    queryKey: ["tokens"],
    queryFn: fetchTokens,
    refetchInterval: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["predictions", "lab"],
    queryFn: () => fetchPredictions({ limit: 8 }),
    refetchInterval: 30_000,
  });

  const tokens = tokenData?.tokens ?? [];
  const predictions = historyData?.predictions ?? [];
  const averageConfidence = predictions.length
    ? Math.round(
        predictions.reduce(
          (sum, prediction) => sum + prediction.confidence_pct,
          0
        ) / predictions.length
      )
    : null;

  return (
    <div className="pb-12 pt-8">
      <section className="app-shell space-y-6">
        <div className="panel rounded-lg px-6 py-7 sm:px-8">
          <span className="section-label">Forecast lab</span>
          <h1 className="mt-3 font-mono text-2xl font-bold tracking-tight text-txt-primary sm:text-3xl">
            How verifiable forecasts are built.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-txt-secondary">
            Every prediction follows the same pipeline: gather market context, run
            inference inside a Trusted Execution Environment, and package the result
            with a cryptographic proof via OpenGradient.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/markets" className="button-primary">
              Back to markets
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="https://docs.opengradient.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="button-secondary"
            >
              OpenGradient docs
            </a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="panel rounded-lg p-5">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-primary">
                Forecast pipeline
              </h2>
              <div className="mt-4 space-y-2">
                {labPanels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <div
                      key={panel.title}
                      className="rounded-lg border border-border bg-bg p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-3.5 w-3.5 text-txt-tertiary" />
                        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-primary">
                          {panel.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-txt-secondary">
                        {panel.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Archive size</p>
                <p className="stat-value">{predictions.length || "--"}</p>
              </div>
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Avg confidence</p>
                <p className="stat-value">
                  {averageConfidence != null ? `${averageConfidence}%` : "--"}
                </p>
              </div>
              <div className="stat-cell rounded-lg">
                <p className="stat-label">Tokens tracked</p>
                <p className="stat-value">{tokens.length || "--"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="section-label">Archive</span>
              <h2 className="mt-3 font-mono text-xl font-semibold text-txt-primary">
                Recent forecast packets
              </h2>
            </div>
            <PredictionArchive predictions={predictions} />
          </div>
        </div>
      </section>
    </div>
  );
}
