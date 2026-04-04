"use client";

export default function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = (pct / 100) * 180;

  let color = "var(--color-bearish)";
  if (pct >= 60) color = "var(--color-bullish)";
  else if (pct >= 40) color = "var(--color-warning)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-40 overflow-hidden">
        <svg viewBox="0 0 120 64" className="h-full w-full">
          <path
            d="M 10 56 A 50 50 0 0 1 110 56"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 10 56 A 50 50 0 0 1 110 56"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 157} 157`}
            style={{
              transition: "stroke-dasharray 0.8s ease, stroke 0.35s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="font-mono text-3xl font-bold" style={{ color }}>
            {pct}
          </span>
          <span className="pb-0.5 font-mono text-xs text-txt-tertiary">%</span>
        </div>
      </div>
      <span className="stat-label">Confidence</span>
    </div>
  );
}
