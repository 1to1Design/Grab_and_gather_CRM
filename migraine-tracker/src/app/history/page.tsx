"use client";

import { useMemo } from "react";
import { Button, Card, Empty, PageTitle } from "@/components/ui";
import { ScaleChip } from "@/components/scale";
import { Sparkline } from "@/components/sparkline";
import { useStore } from "@/lib/store";
import { dayKey, hourKey, summarizeByDay } from "@/lib/analysis";
import {
  aqiCategory,
  formatDate,
  formatPressure,
  formatTemperature,
  formatTime,
} from "@/lib/units";

/**
 * The diary view. Every entry is shown next to the conditions recorded at that
 * exact hour, which is the pairing the whole app exists to produce.
 */
export default function HistoryPage() {
  const { ready, entries, envIndex, settings, meds, doses, removeEntry } = useStore();

  const byDay = useMemo(() => {
    const groups = new Map<string, typeof entries>();
    for (const entry of entries) {
      const day = dayKey(entry.at);
      groups.set(day, [...(groups.get(day) ?? []), entry]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  // Worst score per day for the last 60 days, oldest first.
  const trend = useMemo(() => {
    const summaries = new Map(summarizeByDay(entries).map((s) => [s.day, s.worst]));
    return Array.from({ length: 60 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (59 - i));
      const value = summaries.get(dayKey(date.toISOString()));
      return value === undefined ? null : value;
    });
  }, [entries]);

  if (!ready) return <p className="py-16 text-center text-muted">Loading…</p>;

  if (entries.length === 0) {
    return (
      <div>
        <PageTitle>History</PageTitle>
        <Empty>Nothing logged yet. Your first entry will show up here.</Empty>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle sub={`${entries.length} entries across ${byDay.length} days`}>
        History
      </PageTitle>

      <Card>
        <h2 className="text-sm font-medium text-muted">
          Worst symptom each day, past 60 days
        </h2>
        <Sparkline points={trend} label="Worst symptom score per day over the past 60 days" />
      </Card>

      <div className="space-y-4">
        {byDay.map(([day, dayEntries]) => (
          <div key={day}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {formatDate(`${day}T12:00:00`)}
            </h2>
            <div className="space-y-2">
              {dayEntries.map((entry) => {
                const reading = envIndex.get(hourKey(new Date(entry.at)));
                const dayDoses = doses.filter(
                  (d) => dayKey(d.at) === day,
                );

                return (
                  <Card key={entry.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-medium">{formatTime(entry.at)}</span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Delete this entry?")) {
                            void removeEntry(entry.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(entry.scores).map(([trackerId, score]) => (
                        <ScaleChip
                          key={trackerId}
                          label={
                            settings.trackers.find((t) => t.id === trackerId)?.label ??
                            trackerId
                          }
                          score={score}
                        />
                      ))}
                    </div>

                    {entry.notes ? <p className="mt-2 text-sm">{entry.notes}</p> : null}

                    <ContextLine entry={entry} />

                    {reading ? (
                      <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
                        At that hour: {formatTemperature(reading.temperature, settings.units)},{" "}
                        {formatPressure(reading.pressure, settings.units)},{" "}
                        {reading.humidity === undefined
                          ? "humidity —"
                          : `${Math.round(reading.humidity)}% humidity`}
                        {reading.aqi !== undefined
                          ? `, air ${aqiCategory(reading.aqi).toLowerCase()}`
                          : ""}
                      </p>
                    ) : null}

                    {dayEntries[0].id === entry.id && dayDoses.length > 0 ? (
                      <p className="mt-2 text-xs text-muted">
                        Medication that day:{" "}
                        {dayDoses
                          .map((d) => meds.find((m) => m.id === d.medId)?.name ?? "unknown")
                          .join(", ")}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextLine({ entry }: { entry: { context: Record<string, unknown> } }) {
  const context = entry.context ?? {};
  const parts: string[] = [];
  if (typeof context.sleepHours === "number") parts.push(`${context.sleepHours}h sleep`);
  if (typeof context.stress === "number") parts.push(`stress ${context.stress}/10`);
  if (typeof context.water === "number") parts.push(`${context.water} glasses water`);
  if (typeof context.skippedMeals === "number" && context.skippedMeals > 0) {
    parts.push(`${context.skippedMeals} meals skipped`);
  }
  if (typeof context.cycleDay === "number") parts.push(`cycle day ${context.cycleDay}`);

  if (parts.length === 0) return null;
  return <p className="mt-2 text-xs text-muted">{parts.join(" · ")}</p>;
}
