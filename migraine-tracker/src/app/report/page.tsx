"use client";

import { useMemo, useState } from "react";
import { Button, Card, PageTitle, Select } from "@/components/ui";
import { useStore } from "@/lib/store";
import {
  dayKey,
  findAssociations,
  holmAdjust,
  summarizeByDay,
  FEATURES_BY_ID,
} from "@/lib/analysis";
import { describeStrength, mean } from "@/lib/stats";
import { daysUsedInLast30, overuseStatus } from "@/lib/medication";
import { formatFeatureValue } from "@/lib/format-feature";
import { formatDate } from "@/lib/units";
import { formatP } from "@/app/insights/page";

const RANGES = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
  { days: 3650, label: "All time" },
];

/**
 * A one-page summary written for a clinic visit: how often, how bad, what was
 * taken, and which environmental patterns held up statistically. It prints on
 * a white background regardless of the app's dark theme.
 */
export default function ReportPage() {
  const { ready, entries, envIndex, settings, meds, doses } = useStore();
  const [rangeDays, setRangeDays] = useState(90);
  // Pinned once so the report does not shift under the reader while open, and
  // so date arithmetic stays out of the render body.
  const [now] = useState(() => Date.now());

  const cutoff = useMemo(() => {
    const date = new Date(now - rangeDays * 86400000);
    return date.toISOString();
  }, [rangeDays, now]);

  const rangeEntries = useMemo(
    () => entries.filter((e) => e.at >= cutoff),
    [entries, cutoff],
  );
  const rangeDoses = useMemo(() => doses.filter((d) => d.at >= cutoff), [doses, cutoff]);
  const trackers = settings.trackers.filter((t) => t.enabled);

  const days = useMemo(() => summarizeByDay(rangeEntries), [rangeEntries]);
  const symptomDays = days.filter((d) => d.worst >= 1).length;
  const badDays = days.filter((d) => d.worst >= 6).length;
  // The rate has to be over the window actually covered by data, not the
  // nominal range -- "all time" is a 10-year window that would flatten it.
  const spanDays = useMemo(() => {
    if (!rangeEntries.length) return 0;
    const oldest = new Date(rangeEntries[rangeEntries.length - 1].at).getTime();
    return Math.min(rangeDays, Math.max(1, Math.round((now - oldest) / 86400000) + 1));
  }, [rangeEntries, rangeDays, now]);
  const perMonth = spanDays > 0 ? (symptomDays / spanDays) * 30 : 0;

  const findings = useMemo(() => {
    const all = holmAdjust(findAssociations(rangeEntries, envIndex, trackers));
    const best = new Map<string, (typeof all)[number]>();
    for (const finding of all) {
      const key = `${finding.trackerId}:${finding.featureId}`;
      const current = best.get(key);
      if (!current || Math.abs(finding.r) > Math.abs(current.r)) best.set(key, finding);
    }
    return [...best.values()]
      .filter((f) => f.pAdjusted < 0.05)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeEntries, envIndex, settings.trackers]);

  if (!ready) return <p className="py-16 text-center text-muted">Loading…</p>;

  const first = rangeEntries.length
    ? rangeEntries[rangeEntries.length - 1].at
    : new Date(now).toISOString();

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageTitle sub="Everything a clinician usually asks for, on one page">
          Doctor report
        </PageTitle>
        <div className="flex flex-wrap gap-2">
          <Select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="max-w-48"
          >
            {RANGES.map((range) => (
              <option key={range.days} value={range.days}>
                {range.label}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>
      </div>

      <Card>
        <header className="border-b border-line pb-3">
          <h2 className="text-2xl font-bold">Migraine summary</h2>
          <p className="text-muted">
            {settings.patientName ? `${settings.patientName} · ` : ""}
            {formatDate(first)} to {formatDate(new Date(now).toISOString())} ·{" "}
            {rangeEntries.length} entries on {days.length} days, across a{" "}
            {spanDays}-day window
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Figure value={symptomDays} label="days with symptoms" />
          <Figure value={perMonth.toFixed(1)} label="symptom days per 30" />
          <Figure value={badDays} label="days rated 6+" />
          <Figure
            value={rangeDoses.length}
            label="medication doses"
          />
        </div>

        <h3 className="mt-6 font-semibold">By symptom</h3>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1 font-medium">Symptom</th>
              <th className="py-1 pl-3 text-right font-medium">Days</th>
              <th className="py-1 pl-3 text-right font-medium">Avg. when present</th>
              <th className="py-1 pl-3 text-right font-medium">Worst</th>
            </tr>
          </thead>
          <tbody>
            {trackers.map((tracker) => {
              const scores = rangeEntries
                .map((e) => e.scores[tracker.id])
                .filter((s): s is number => typeof s === "number" && s > 0);
              const daysPresent = new Set(
                rangeEntries
                  .filter((e) => (e.scores[tracker.id] ?? 0) > 0)
                  .map((e) => dayKey(e.at)),
              ).size;
              return (
                <tr key={tracker.id} className="border-t border-line">
                  <td className="py-1.5">{tracker.label}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">{daysPresent}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">
                    {scores.length ? mean(scores).toFixed(1) : "—"}
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">
                    {scores.length ? Math.max(...scores) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="mt-6 font-semibold">Medication use</h3>
        {meds.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No medications recorded.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1 font-medium">Medication</th>
                <th className="py-1 pl-3 text-right font-medium">Doses</th>
                <th className="py-1 pl-3 text-right font-medium">Days used, last 30</th>
                <th className="py-1 pl-3 text-right font-medium">Overuse threshold</th>
              </tr>
            </thead>
            <tbody>
              {meds.map((med) => {
                const count = rangeDoses.filter((d) => d.medId === med.id).length;
                const status = overuseStatus(med, doses);
                const days30 = daysUsedInLast30(med.id, doses);
                return (
                  <tr key={med.id} className="border-t border-line">
                    <td className="py-1.5">
                      {med.name} {med.dose ? <span className="text-muted">{med.dose}</span> : null}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{count}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{days30}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">
                      {status
                        ? `${status.threshold}/month${status.atThreshold ? " — reached" : ""}`
                        : "n/a"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-muted">
          Overuse thresholds follow ICHD-3 section 8.2 (medication-overuse headache):
          10 days a month for triptans, ergotamines, opioids and combination
          analgesics; 15 days a month for simple analgesics and NSAIDs. Counting
          days is not a diagnosis.
        </p>

        <h3 className="mt-6 font-semibold">Environmental associations</h3>
        {findings.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            No environmental association reached statistical significance after
            adjusting for multiple comparisons in this period.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {findings.map((finding) => {
              const feature = FEATURES_BY_ID.get(finding.featureId);
              return (
                <li key={`${finding.trackerId}:${finding.featureId}`}>
                  <strong>{finding.trackerLabel}</strong> vs {finding.featureLabel}
                  {finding.lagHours > 0 ? ` (${finding.lagHours}h earlier)` : ""}:{" "}
                  {describeStrength(finding.r)} {finding.r > 0 ? "positive" : "negative"}{" "}
                  association, Spearman ρ = {finding.r.toFixed(2)}, n = {finding.n},
                  p = {formatP(finding.p)} (Holm-adjusted {formatP(finding.pAdjusted)})
                  {finding.contrast && feature
                    ? `. Mean score ${finding.contrast.lowMean.toFixed(1)} near ${formatFeatureValue(feature, finding.contrast.lowValue, settings.units)} versus ${finding.contrast.highMean.toFixed(1)} near ${formatFeatureValue(feature, finding.contrast.highValue, settings.units)}.`
                    : "."}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
          Self-reported data collected with a personal tracking app. Environmental
          readings are hourly modelled values for the patient&apos;s saved location,
          from Open-Meteo. Correlations are Spearman rank coefficients with
          Holm-Bonferroni adjustment across all symptom and variable pairs tested.
          Associations are not evidence of causation.
        </p>
      </Card>
    </div>
  );
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="print-plain rounded-xl border border-line bg-surface-2 p-3">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
