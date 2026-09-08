"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EnvPanel } from "@/components/env-panel";
import { ScaleChip, ScaleInput } from "@/components/scale";
import {
  Button,
  Card,
  Field,
  PageTitle,
  SectionTitle,
  TextArea,
  TextInput,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/analysis";
import { medStatus, sortForCaregiver } from "@/lib/medication";
import { formatTime } from "@/lib/units";
import type { EntryContext, Score } from "@/lib/types";

/** Formats a Date for a datetime-local input, which wants local wall time. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function TodayPage() {
  const { ready, settings, entries, meds, doses, addEntry } = useStore();

  const [scores, setScores] = useState<Record<string, Score>>({});
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState<EntryContext>({});
  const [at, setAt] = useState(() => toLocalInput(new Date()));
  const [saved, setSaved] = useState(false);

  const trackers = settings.trackers.filter((t) => t.enabled);
  const anyRated = Object.keys(scores).length > 0;

  const today = dayKey(new Date().toISOString());
  const todaysEntries = entries.filter((e) => dayKey(e.at) === today);

  const dueNow = useMemo(() => {
    const active = meds.filter((m) => !m.archived);
    return sortForCaregiver(active.map((m) => medStatus(m, doses))).filter((s) =>
      s.summary.startsWith("Due now"),
    );
  }, [meds, doses]);

  function setScore(trackerId: string, value: number | undefined) {
    setSaved(false);
    setScores((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[trackerId];
      else next[trackerId] = value;
      return next;
    });
  }

  async function save() {
    if (!anyRated) return;
    await addEntry({
      at: new Date(at).toISOString(),
      scores,
      notes: notes.trim(),
      context,
    });
    setScores({});
    setNotes("");
    setContext({});
    setAt(toLocalInput(new Date()));
    setSaved(true);
  }

  if (!ready) {
    return <p className="py-16 text-center text-muted">Loading your data…</p>;
  }

  return (
    <div className="space-y-5">
      <PageTitle
        sub={new Date().toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      >
        How are you doing?
      </PageTitle>

      <EnvPanel />

      {dueNow.length > 0 ? (
        <Link href="/meds" className="block">
          <Card className="border-accent/60 bg-accent/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {dueNow.length} medication{dueNow.length > 1 ? "s" : ""} due now
                </h2>
                <p className="text-sm text-muted">
                  {dueNow.map((s) => s.med.name).join(", ")}
                </p>
              </div>
              <span aria-hidden className="text-2xl">
                ›
              </span>
            </div>
          </Card>
        </Link>
      ) : null}

      <div>
        <SectionTitle>Rate what you are feeling</SectionTitle>
        {trackers.length === 0 ? (
          <Card>
            <p className="text-muted">
              Every tracker is switched off. Turn some back on in Settings.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {trackers.map((tracker) => (
              <ScaleInput
                key={tracker.id}
                tracker={tracker}
                value={scores[tracker.id]}
                onChange={(value) => setScore(tracker.id, value)}
              />
            ))}
          </div>
        )}
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-base font-semibold">
            Other things from today{" "}
            <span className="font-normal text-muted">(optional)</span>
          </summary>
          <p className="mt-2 text-sm text-muted">
            Sleep, stress, hydration, and cycle timing come up in almost every
            neurology appointment. Filling these in makes the patterns screen able
            to weigh them against the weather.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Hours slept">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                value={context.sleepHours ?? ""}
                onChange={(e) =>
                  setContext((c) => ({
                    ...c,
                    sleepHours: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Stress (0–10)">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                value={context.stress ?? ""}
                onChange={(e) =>
                  setContext((c) => ({
                    ...c,
                    stress: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Glasses of water">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={context.water ?? ""}
                onChange={(e) =>
                  setContext((c) => ({
                    ...c,
                    water: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Meals skipped">
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                value={context.skippedMeals ?? ""}
                onChange={(e) =>
                  setContext((c) => ({
                    ...c,
                    skippedMeals: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Cycle day" hint="Day 1 is the first day of a period">
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={context.cycleDay ?? ""}
                onChange={(e) =>
                  setContext((c) => ({
                    ...c,
                    cycleDay: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Time of this entry" hint="Change it to log an earlier moment">
              <TextInput
                type="datetime-local"
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
          </div>
        </details>
      </Card>

      <Card>
        <Field
          label="Notes"
          hint="What you were doing, what helped, anything a doctor should hear"
        >
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Started after lunch. Lying down in the dark helped a little."
          />
        </Field>
      </Card>

      {/* An opaque bar rather than a floating button: it sits directly above
          the nav and must never let text show through from behind it. */}
      <div className="no-print sticky bottom-[4.25rem] z-10 -mx-4 border-t border-line bg-bg px-4 pb-3 pt-3">
        <Button variant="primary" size="lg" onClick={() => void save()} disabled={!anyRated}>
          {anyRated ? "Save this entry" : "Rate at least one symptom"}
        </Button>
        {saved ? (
          <p className="mt-2 text-center text-sm text-accent">Saved. ✓</p>
        ) : null}
      </div>

      {todaysEntries.length > 0 ? (
        <div>
          <SectionTitle
            action={
              <Link href="/history" className="text-sm text-muted underline underline-offset-4">
                All history
              </Link>
            }
          >
            Logged today
          </SectionTitle>
          <div className="space-y-2">
            {todaysEntries.map((entry) => (
              <Card key={entry.id}>
                <div className="mb-2 text-sm text-muted">{formatTime(entry.at)}</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(entry.scores).map(([trackerId, score]) => {
                    const tracker = settings.trackers.find((t) => t.id === trackerId);
                    return (
                      <ScaleChip
                        key={trackerId}
                        label={tracker?.label ?? trackerId}
                        score={score}
                      />
                    );
                  })}
                </div>
                {entry.notes ? <p className="mt-2 text-sm">{entry.notes}</p> : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
