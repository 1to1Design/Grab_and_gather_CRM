"use client";

import type { Tracker } from "@/lib/types";

/**
 * The 0-10 rating control. Three ways to set the same number, because which
 * one is usable depends on how bad the attack is: drag the big slider, tap a
 * numbered button, or tap "None" to clear.
 */

const SEVERITY_WORDS = [
  "None",
  "Barely there",
  "Mild",
  "Mild",
  "Noticeable",
  "Moderate",
  "Moderate",
  "Bad",
  "Severe",
  "Severe",
  "Worst imaginable",
];

export function severityLabel(score: number) {
  return SEVERITY_WORDS[Math.max(0, Math.min(10, Math.round(score)))];
}

export function ScaleInput({
  tracker,
  value,
  onChange,
}: {
  tracker: Tracker;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const rated = typeof value === "number";
  const shown = rated ? value : 0;

  return (
    <div
      className={`${rated ? `sev-${Math.round(shown)}` : "sev-none"} rounded-2xl border border-line bg-surface p-4`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{tracker.label}</h3>
          <p className="text-sm text-muted">{tracker.hint}</p>
        </div>
        <div className="text-right">
          <div
            className="text-4xl font-bold tabular-nums leading-none"
            style={{ color: rated ? "var(--sev)" : "var(--muted)" }}
          >
            {rated ? shown : "–"}
          </div>
          <div className="text-xs text-muted">{rated ? severityLabel(shown) : "not rated"}</div>
        </div>
      </div>

      <input
        type="range"
        className="big-range mt-2"
        min={0}
        max={10}
        step={1}
        value={shown}
        aria-label={`${tracker.label}, 0 to 10`}
        aria-valuetext={rated ? `${shown}, ${severityLabel(shown)}` : "not rated"}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div className="mt-1 flex gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Set ${tracker.label} to ${n}`}
            aria-pressed={rated && shown === n}
            className={`sev-${n} min-h-11 flex-1 rounded-lg border text-sm font-semibold tabular-nums transition ${
              rated && shown === n
                ? "border-transparent text-[#14110f]"
                : "border-line bg-surface-2 text-muted hover:text-text"
            }`}
            style={rated && shown === n ? { background: "var(--sev)" } : undefined}
          >
            {n}
          </button>
        ))}
      </div>

      {rated ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-2 min-h-9 text-sm text-muted underline underline-offset-4 hover:text-text"
        >
          Clear this rating
        </button>
      ) : null}
    </div>
  );
}

/** Compact read-only version, used in history and the doctor report. */
export function ScaleChip({ label, score }: { label: string; score: number }) {
  return (
    <span
      className={`sev-${Math.round(score)} print-plain inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-sm`}
    >
      <span className="text-muted">{label}</span>
      <strong className="tabular-nums" style={{ color: "var(--sev)" }}>
        {score}
      </strong>
    </span>
  );
}
