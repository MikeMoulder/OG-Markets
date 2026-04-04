"use client";

import type { Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";

const options: { value: Timeframe; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
];

export default function TimeframeSelector({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-bg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[3px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider",
            value === opt.value
              ? "bg-elevated text-txt-primary"
              : "text-txt-muted hover:text-txt-tertiary"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
