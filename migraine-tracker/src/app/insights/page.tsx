"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Empty, PageTitle, SectionTitle, Select } from "@/components/ui";
import { useStore } from "@/lib/store";
import {
  dayKey,
  findAssociations,
  holmAdjust,
  FEATURES_BY_ID,
  type Finding,
} from "@/lib/analysis";
import { describeStrength } from "@/lib/stats";
import { formatFeatureValue } from "@/lib/format-feature";
import type { Units } from "@/lib/types";

/** Below this many logged days, the app says so instead of showing findings. */
const MIN_DAYS = 14;

export default function InsightsPage() {
  const { ready, entries, envIndex, settings } = useStore();
  const [trackerFilter, setTrackerFilter] = useState("all");

  const trackers = settings.trackers.filter((t) => t.enabled);
  const daysLogged = useMemo(
    () => new Set(entries.map((e) => dayKey(e.at))).size,
    [entries],
  );

  const findings = useMemo(() => {
    if (daysLogged < MIN_DAYS) return [];
    return holmAdjust(findAssociations(entries, envIndex, trackers));
    // trackers is derived from settings each render; keying on the settings
    // object keeps this from recomputing on unrelated state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, envIndex, settings.trackers, daysLogged]);

  const visible = useMemo(() => {
    const filtered =
      trackerFilter === "all"
        ? findings
        : findings.filter((f) => f.trackerId === trackerFilter);
    // Only the strongest lag per symptom/variable pair is shown; the same
    // relationship at 0h, 6h, 12h and 24h is one finding, not four.
    const best = new Map<string, (typeof filtered)[number]>();
    for (const finding of filtered) {
      const key = `${finding.trackerId}:${finding.featureId}`;
      const current = best.get(key);
      if (!current || Math.abs(finding.r) > Math.abs(current.r)) best.set(key, finding);
    }

    // Capped per symptom as well, otherwise one dominant variable (usually
    // pressure, in several flavours) fills the screen and hides everything else.
    const perTracker = new Map<string, number>();
    return [...best.values()]
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .filter((finding) => {
        const seen = perTracker.get(finding.trackerId) ?? 0;
        if (seen >= 2) return false;
        perTracker.set(finding.trackerId, seen + 1);
        return true;
      })
      .slice(0, 12);
  }, [findings, trackerFilter]);

  if (!ready) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <PageTitle sub="What your own data says — not what the internet says about migraines">
        Patterns
      </PageTitle>

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-3xl font-bold tabular-nums">{daysLogged}</div>
            <div className="text-sm text-muted">days logged</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">{entries.length}</div>
            <div className="text-sm text-muted">entries</div>
          </div>
        </div>
        {daysLogged < MIN_DAYS ? (
          <p className="mt-3 text-muted">
            Patterns appear after about {MIN_DAYS} days of logging, and get
            genuinely useful after two or three months. {MIN_DAYS - daysLogged} more
            {MIN_DAYS - daysLogged === 1 ? " day" : " days"} to go.
          </p>
        ) : null}
      </Card>

      {daysLogged >= MIN_DAYS ? (
        <>
          <SectionTitle
            action={
              <Select
                value={trackerFilter}
                onChange={(e) => setTrackerFilter(e.target.value)}
                className="max-w-52"
              >
                <option value="all">All symptoms</option>
                {trackers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            }
          >
            Strongest associations
          </SectionTitle>

          {visible.length === 0 ? (
            <Empty>
              Nothing has emerged yet. That is a real result too — it can mean the
              weather is not a major driver for you, or simply that there is not
              enough data spread across different conditions yet.
            </Empty>
          ) : (
            <div className="space-y-3">
              {visible.map((finding) => (
                <FindingCard
                  key={`${finding.trackerId}:${finding.featureId}:${finding.lagHours}`}
                  finding={finding}
                  units={settings.units}
                />
              ))}
            </div>
          )}

          <Card>
            <h3 className="font-semibold">How to read these</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong className="text-text">Association is not cause.</strong> A
                strong pattern here means the two moved together, not that one
                caused the other.
              </li>
              <li>
                <strong className="text-text">Sample size matters most.</strong> A
                strong-looking correlation over 10 entries is far weaker evidence
                than a moderate one over 200.
              </li>
              <li>
                <strong className="text-text">Adjusted p-values</strong> account for
                the fact that the app tests many weather variables at once, which
                would otherwise throw up false positives by chance alone. A finding
                that survives the adjustment is the one worth mentioning to a doctor.
              </li>
            </ul>
            <Link href="/report" className="mt-4 block">
              <Button variant="primary" size="lg">
                Build a report for the doctor
              </Button>
            </Link>
          </Card>
        </>
      ) : (
        <Empty>
          Keep logging. Every entry pairs your symptoms with the exact weather,
          pressure, and air quality at that hour, so nothing is lost while you wait.
        </Empty>
      )}
    </div>
  );
}

export function FindingCard({
  finding,
  units,
}: {
  finding: Finding & { pAdjusted: number };
  units: Units;
}) {
  const feature = FEATURES_BY_ID.get(finding.featureId);
  const direction = finding.r > 0 ? "higher" : "lower";
  const survives = finding.pAdjusted < 0.05;

  return (
    <Card className={survives ? "border-accent/50" : undefined}>
      <h3 className="text-lg font-semibold">
        {finding.trackerLabel} tracked with {direction} {finding.featureLabel.toLowerCase()}
      </h3>

      {finding.contrast && feature ? (
        <p className="mt-2 text-base">
          Around{" "}
          <strong className="tabular-nums">{finding.contrast.lowMean.toFixed(1)}</strong>{" "}
          out of 10 when it was near{" "}
          {formatFeatureValue(feature, finding.contrast.lowValue, units)}, versus{" "}
          <strong className="tabular-nums">{finding.contrast.highMean.toFixed(1)}</strong>{" "}
          near {formatFeatureValue(feature, finding.contrast.highValue, units)}.
        </p>
      ) : null}

      <p className="mt-2 text-sm text-muted">
        {describeStrength(finding.r)} association (Spearman ρ ={" "}
        <span className="tabular-nums">{finding.r.toFixed(2)}</span>) across{" "}
        <span className="tabular-nums">{finding.n}</span> entries
        {finding.lagHours > 0
          ? `, using conditions ${finding.lagHours} hours before each entry`
          : ""}
        . p = <span className="tabular-nums">{formatP(finding.p)}</span>,{" "}
        <span className="tabular-nums">{formatP(finding.pAdjusted)}</span> after
        adjusting for multiple comparisons
        {survives ? " — holds up" : " — does not hold up yet"}.
      </p>
    </Card>
  );
}

export function formatP(p: number): string {
  if (p < 0.001) return "<0.001";
  return p.toFixed(3);
}
