/**
 * CSV export. The point is that the diary should never be trapped in this app:
 * a clinic, a spreadsheet, or a different tracker can all read a CSV.
 */

import type { DoseEvent, EnvReading, Medication, SymptomEntry, Tracker } from "./types";
import { hourKey } from "./analysis";

function escapeCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

/** One row per symptom entry, with the matching hour of weather beside it. */
export function entriesToCsv(
  entries: SymptomEntry[],
  trackers: Tracker[],
  envIndex: Map<string, EnvReading>,
): string {
  const header = [
    "timestamp",
    ...trackers.map((t) => t.label),
    "sleep_hours",
    "stress",
    "water_glasses",
    "meals_skipped",
    "cycle_day",
    "notes",
    "temperature_c",
    "pressure_hpa",
    "humidity_pct",
    "us_aqi",
    "pm2_5",
    "wind_gusts_kmh",
    "uv_index",
    "precipitation_mm",
  ];

  const rows = [...entries]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((entry) => {
      const env = envIndex.get(hourKey(new Date(entry.at)));
      return [
        entry.at,
        ...trackers.map((t) => entry.scores[t.id] ?? ""),
        entry.context?.sleepHours ?? "",
        entry.context?.stress ?? "",
        entry.context?.water ?? "",
        entry.context?.skippedMeals ?? "",
        entry.context?.cycleDay ?? "",
        entry.notes ?? "",
        env?.temperature ?? "",
        env?.pressure ?? "",
        env?.humidity ?? "",
        env?.aqi ?? "",
        env?.pm25 ?? "",
        env?.windGusts ?? "",
        env?.uvIndex ?? "",
        env?.precipitation ?? "",
      ];
    });

  return toCsv([header, ...rows]);
}

export function dosesToCsv(doses: DoseEvent[], meds: Medication[]): string {
  const byId = new Map(meds.map((m) => [m.id, m]));
  const header = ["timestamp", "medication", "dose", "class", "role", "given_by", "notes"];
  const rows = [...doses]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((dose) => {
      const med = byId.get(dose.medId);
      return [
        dose.at,
        med?.name ?? "deleted",
        med?.dose ?? "",
        med?.medClass ?? "",
        med?.role ?? "",
        dose.givenBy ?? "",
        dose.notes ?? "",
      ];
    });
  return toCsv([header, ...rows]);
}

/** Triggers a browser download of text content. */
export function downloadText(filename: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
