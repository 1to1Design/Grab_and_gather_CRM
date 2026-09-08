/**
 * Joins symptom entries to the environmental history and looks for patterns.
 *
 * The point of this file is the thing a doctor's appointment cannot do: notice
 * that *this particular person's* attacks track a falling barometer, or high
 * humidity, or nothing environmental at all. Published research is clear that
 * weather sensitivity varies person to person -- some people react to falling
 * pressure and others to rising -- so the app never assumes a direction. It
 * measures the individual and reports what it finds, including "nothing yet".
 */

import type { EnvReading, SymptomEntry, Tracker } from "./types";
import { spearman, type Correlation } from "./stats";

/** Formats a Date as the local hour key Open-Meteo returns, "YYYY-MM-DDTHH:00". */
export function hourKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:00`
  );
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Shifts an hour key backwards by whole hours. */
export function shiftHours(hour: string, hoursBack: number): string {
  const date = new Date(`${hour}:00`);
  date.setHours(date.getHours() - hoursBack);
  return hourKey(date);
}

export type EnvIndex = Map<string, EnvReading>;

export function buildEnvIndex(readings: EnvReading[]): EnvIndex {
  return new Map(readings.map((r) => [r.hour, r]));
}

export type FeatureGroup = "pressure" | "temperature" | "air" | "other";

export type EnvFeature = {
  id: string;
  label: string;
  /** Unit shown in metric storage terms; display conversion happens in the UI. */
  unit: string;
  group: FeatureGroup;
  /** Whether the raw value should be unit-converted for display. */
  convert?: "temperature" | "temperatureDelta" | "pressure" | "wind";
  get: (index: EnvIndex, hour: string) => number | undefined;
};

function at(index: EnvIndex, hour: string, key: keyof EnvReading) {
  const value = index.get(hour)?.[key];
  return typeof value === "number" ? value : undefined;
}

function change(
  index: EnvIndex,
  hour: string,
  key: keyof EnvReading,
  hoursBack: number,
) {
  const now = at(index, hour, key);
  const then = at(index, shiftHours(hour, hoursBack), key);
  return now === undefined || then === undefined ? undefined : now - then;
}

/**
 * The environmental variables the app correlates against symptoms. Rates of
 * change get their own entries because the research on barometric pressure
 * points at *changes* -- drops and rapid swings -- more than at absolute
 * readings.
 */
export const ENV_FEATURES: EnvFeature[] = [
  {
    id: "pressure",
    label: "Barometric pressure",
    unit: "hPa",
    group: "pressure",
    convert: "pressure",
    get: (i, h) => at(i, h, "pressure"),
  },
  {
    id: "pressureChange3h",
    label: "Pressure change, past 3h",
    unit: "hPa",
    group: "pressure",
    convert: "pressure",
    get: (i, h) => change(i, h, "pressure", 3),
  },
  {
    id: "pressureChange6h",
    label: "Pressure change, past 6h",
    unit: "hPa",
    group: "pressure",
    convert: "pressure",
    get: (i, h) => change(i, h, "pressure", 6),
  },
  {
    id: "pressureChange24h",
    label: "Pressure change, past 24h",
    unit: "hPa",
    group: "pressure",
    convert: "pressure",
    get: (i, h) => change(i, h, "pressure", 24),
  },
  {
    id: "temperature",
    label: "Temperature",
    unit: "°",
    group: "temperature",
    convert: "temperature",
    get: (i, h) => at(i, h, "temperature"),
  },
  {
    id: "temperatureChange24h",
    label: "Temperature change, past 24h",
    unit: "°",
    group: "temperature",
    convert: "temperatureDelta",
    get: (i, h) => change(i, h, "temperature", 24),
  },
  {
    id: "humidity",
    label: "Humidity",
    unit: "%",
    group: "temperature",
    get: (i, h) => at(i, h, "humidity"),
  },
  {
    id: "aqi",
    label: "Air quality index (US AQI)",
    unit: "AQI",
    group: "air",
    get: (i, h) => at(i, h, "aqi"),
  },
  {
    id: "pm25",
    label: "Fine particulates (PM2.5)",
    unit: "µg/m³",
    group: "air",
    get: (i, h) => at(i, h, "pm25"),
  },
  {
    id: "ozone",
    label: "Ozone",
    unit: "µg/m³",
    group: "air",
    get: (i, h) => at(i, h, "ozone"),
  },
  {
    id: "grassPollen",
    label: "Grass pollen",
    unit: "grains/m³",
    group: "air",
    get: (i, h) => at(i, h, "grassPollen"),
  },
  {
    id: "treePollen",
    label: "Tree pollen",
    unit: "grains/m³",
    group: "air",
    get: (i, h) => at(i, h, "treePollen"),
  },
  {
    id: "weedPollen",
    label: "Weed pollen",
    unit: "grains/m³",
    group: "air",
    get: (i, h) => at(i, h, "weedPollen"),
  },
  {
    id: "windGusts",
    label: "Wind gusts",
    unit: "km/h",
    group: "other",
    convert: "wind",
    get: (i, h) => at(i, h, "windGusts"),
  },
  {
    id: "uvIndex",
    label: "UV index",
    unit: "",
    group: "other",
    get: (i, h) => at(i, h, "uvIndex"),
  },
  {
    id: "precipitation",
    label: "Precipitation",
    unit: "mm",
    group: "other",
    get: (i, h) => at(i, h, "precipitation"),
  },
  {
    id: "cloudCover",
    label: "Cloud cover",
    unit: "%",
    group: "other",
    get: (i, h) => at(i, h, "cloudCover"),
  },
];

export const FEATURES_BY_ID = new Map(ENV_FEATURES.map((f) => [f.id, f]));

/** Lags let the app ask "did the weather 12 hours ago predict today's pain?" */
export const LAG_OPTIONS = [0, 6, 12, 24] as const;
export type Lag = (typeof LAG_OPTIONS)[number];

export type Finding = Correlation & {
  featureId: string;
  featureLabel: string;
  trackerId: string;
  trackerLabel: string;
  lagHours: number;
  /**
   * A plain-English contrast to sit beside the correlation: the average
   * symptom score on the third of readings where this variable was lowest,
   * versus the third where it was highest. Rho tells a clinician how reliable
   * the pattern is; this tells the patient what it actually felt like.
   */
  contrast: {
    lowValue: number;
    highValue: number;
    lowMean: number;
    highMean: number;
  } | null;
};

/**
 * Correlates every environmental feature against every tracked symptom, at
 * every lag, and returns the findings sorted strongest first.
 *
 * With ~17 features x several symptoms x 4 lags this is a lot of tests, and
 * some will look significant by chance alone. `holmAdjust` below is what keeps
 * the Insights screen from confidently reporting noise.
 */
export function findAssociations(
  entries: SymptomEntry[],
  index: EnvIndex,
  trackers: Tracker[],
): Finding[] {
  const findings: Finding[] = [];

  for (const tracker of trackers) {
    const rated = entries.filter((e) => typeof e.scores[tracker.id] === "number");
    if (rated.length < 8) continue;

    for (const feature of ENV_FEATURES) {
      for (const lag of LAG_OPTIONS) {
        const xs: number[] = [];
        const ys: number[] = [];

        for (const entry of rated) {
          const hour = shiftHours(hourKey(new Date(entry.at)), lag);
          const value = feature.get(index, hour);
          if (value === undefined) continue;
          xs.push(value);
          ys.push(entry.scores[tracker.id]);
        }

        const result = spearman(xs, ys);
        if (!result) continue;

        findings.push({
          ...result,
          contrast: tercileContrast(xs, ys),
          featureId: feature.id,
          featureLabel: feature.label,
          trackerId: tracker.id,
          trackerLabel: tracker.label,
          lagHours: lag,
        });
      }
    }
  }

  return findings.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

/**
 * Splits paired data at the lowest and highest thirds of the environmental
 * value and averages the symptom score in each, so a finding can be stated as
 * "3.1 on the calmest days, 6.4 on the stormiest" rather than only as a rho.
 */
function tercileContrast(xs: number[], ys: number[]): Finding["contrast"] {
  const pairs = xs.map((x, i) => ({ x, y: ys[i] })).sort((a, b) => a.x - b.x);
  const size = Math.floor(pairs.length / 3);
  if (size < 3) return null;

  const low = pairs.slice(0, size);
  const high = pairs.slice(-size);
  const average = (values: number[]) =>
    values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    lowValue: average(low.map((r) => r.x)),
    highValue: average(high.map((r) => r.x)),
    lowMean: average(low.map((r) => r.y)),
    highMean: average(high.map((r) => r.y)),
  };
}

/**
 * Holm-Bonferroni correction. Testing dozens of weather variables against
 * dozens of symptoms guarantees a few p < 0.05 results from pure chance; this
 * marks which findings survive that reality. Holm is used rather than plain
 * Bonferroni because it is uniformly more powerful at the same error rate.
 */
export function holmAdjust(findings: Finding[]): Array<Finding & { pAdjusted: number }> {
  const ordered = [...findings].sort((a, b) => a.p - b.p);
  const m = ordered.length;
  let running = 0;

  const adjusted = ordered.map((finding, i) => {
    running = Math.max(running, Math.min(1, finding.p * (m - i)));
    return { ...finding, pAdjusted: running };
  });

  return adjusted.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

/** One row per calendar day, used by the report and the trend chart. */
export type DailySummary = {
  day: string;
  /** Worst score recorded that day, across all trackers. */
  worst: number;
  /** Per-tracker worst score that day. */
  byTracker: Record<string, number>;
  entryCount: number;
};

export function summarizeByDay(entries: SymptomEntry[]): DailySummary[] {
  const days = new Map<string, DailySummary>();

  for (const entry of entries) {
    const day = dayKey(entry.at);
    const summary =
      days.get(day) ?? { day, worst: 0, byTracker: {}, entryCount: 0 };

    summary.entryCount += 1;
    for (const [trackerId, score] of Object.entries(entry.scores)) {
      if (typeof score !== "number") continue;
      summary.byTracker[trackerId] = Math.max(
        summary.byTracker[trackerId] ?? 0,
        score,
      );
      summary.worst = Math.max(summary.worst, score);
    }
    days.set(day, summary);
  }

  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * A plain statement of what changed, with no claim about what it means.
 * Personalized interpretation comes from the user's own findings instead.
 */
export type Condition = {
  id: string;
  label: string;
  detail: string;
};

export function currentConditions(
  index: EnvIndex,
  hour: string,
  pressureLabel: (hPa: number) => string,
): Condition[] {
  const conditions: Condition[] = [];

  // Only genuinely unusual readings appear here. An ordinary day should show
  // nothing at all, so that when something does appear it means something.
  const drop24 = change(index, hour, "pressure", 24);
  // Around 5 hPa in a day is a weather front passing through rather than the
  // ordinary daily rise and fall.
  if (drop24 !== undefined && Math.abs(drop24) >= 5) {
    conditions.push({
      id: "pressureChange24h",
      label: "Pressure, past 24 hours",
      detail: `${drop24 > 0 ? "Up" : "Down"} ${pressureLabel(Math.abs(drop24))}`,
    });
  }

  const drop3 = change(index, hour, "pressure", 3);
  if (drop3 !== undefined && Math.abs(drop3) >= 2) {
    conditions.push({
      id: "pressureChange3h",
      label: "Pressure, past 3 hours",
      detail: `${drop3 > 0 ? "Up" : "Down"} ${pressureLabel(Math.abs(drop3))} quickly`,
    });
  }

  const humidity = at(index, hour, "humidity");
  if (humidity !== undefined && humidity >= 70) {
    conditions.push({
      id: "humidity",
      label: "Humidity",
      detail: `${Math.round(humidity)}% — high`,
    });
  }

  const aqi = at(index, hour, "aqi");
  if (aqi !== undefined && aqi > 100) {
    conditions.push({
      id: "aqi",
      label: "Air quality",
      detail: `AQI ${Math.round(aqi)} — unhealthy for sensitive groups`,
    });
  }

  const tempSwing = change(index, hour, "temperature", 24);
  if (tempSwing !== undefined && Math.abs(tempSwing) >= 8) {
    conditions.push({
      id: "temperatureChange24h",
      label: "Temperature swing",
      detail: `${tempSwing > 0 ? "Up" : "Down"} ${Math.abs(Math.round(tempSwing * 1.8))}° since yesterday`,
    });
  }

  return conditions;
}
