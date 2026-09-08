"use client";

import { useMemo, useState } from "react";
import { MedForm } from "@/components/med-form";
import { Button, Card, Empty, PageTitle, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { medStatus, sortForCaregiver, type MedStatus } from "@/lib/medication";
import { dayKey } from "@/lib/analysis";
import { formatDateTime, formatTime } from "@/lib/units";
import type { Medication } from "@/lib/types";

/**
 * The medication screen doubles as the handoff surface: someone who is not the
 * patient should be able to open this, read one line, and know whether to give
 * a dose. Everything else on the card is secondary to that sentence.
 */
export default function MedsPage() {
  const { ready, meds, doses, upsertMed, removeMed, recordDose, removeDose } = useStore();
  const [editing, setEditing] = useState<Medication | null>(null);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const statuses = useMemo(() => {
    const active = meds.filter((m) => (showArchived ? true : !m.archived));
    return sortForCaregiver(active.map((m) => medStatus(m, doses)));
  }, [meds, doses, showArchived]);

  const today = dayKey(new Date().toISOString());
  const todaysDoses = doses.filter((d) => dayKey(d.at) === today);

  if (!ready) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <PageTitle sub="What to take, when, and what has already been given">
        Medications
      </PageTitle>

      {adding || editing ? (
        <MedForm
          existing={editing ?? undefined}
          onSave={async (med) => {
            await upsertMed(med);
            setAdding(false);
            setEditing(null);
          }}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : (
        <Button variant="primary" size="lg" onClick={() => setAdding(true)}>
          + Add a medication
        </Button>
      )}

      {statuses.length === 0 ? (
        <Empty>
          No medications yet. Add each prescription with its dose and limits, and
          this page turns into a checklist anyone helping can follow.
        </Empty>
      ) : (
        <div className="space-y-3">
          {statuses.map((status) => (
            <MedCard
              key={status.med.id}
              status={status}
              onTake={() =>
                void recordDose({ medId: status.med.id, at: new Date().toISOString() })
              }
              onEdit={() => setEditing(status.med)}
              onArchive={() =>
                void upsertMed({ ...status.med, archived: !status.med.archived })
              }
              onDelete={() => {
                if (
                  window.confirm(
                    `Delete ${status.med.name} and keep its dose history? Archiving instead keeps the medication on file.`,
                  )
                ) {
                  void removeMed(status.med.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {meds.some((m) => m.archived) ? (
        <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide archived" : "Show archived medications"}
        </Button>
      ) : null}

      {todaysDoses.length > 0 ? (
        <div>
          <SectionTitle>Given today</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {todaysDoses.map((dose) => {
                const med = meds.find((m) => m.id === dose.medId);
                return (
                  <li key={dose.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-medium">{med?.name ?? "Deleted medication"}</div>
                      <div className="text-sm text-muted">
                        {formatTime(dose.at)}
                        {dose.givenBy ? ` · given by ${dose.givenBy}` : ""}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Remove this dose from the log?")) {
                          void removeDose(dose.id);
                        }
                      }}
                    >
                      Undo
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MedCard({
  status,
  onTake,
  onEdit,
  onArchive,
  onDelete,
}: {
  status: MedStatus;
  onTake: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { med, overuse, last } = status;
  const due = status.summary.startsWith("Due now");

  return (
    <Card className={due ? "border-accent/60" : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">
            {med.name} {med.dose ? <span className="text-muted">{med.dose}</span> : null}
          </h3>
          <p className="text-sm text-muted">
            {med.form}
            {med.role === "rescue" ? " · taken during an attack" : ""}
            {med.role === "preventive" ? " · daily preventive" : ""}
            {med.prescriber ? ` · ${med.prescriber}` : ""}
          </p>
        </div>
        {med.archived ? (
          <span className="rounded-lg border border-line px-2 py-1 text-xs text-muted">
            Archived
          </span>
        ) : null}
      </div>

      <p className={`mt-3 text-base font-medium ${due ? "text-accent" : ""}`}>
        {status.summary}
      </p>

      {med.instructions ? (
        <p className="mt-2 rounded-xl border border-line bg-surface-2 p-3 text-base font-medium">
          {med.instructions}
        </p>
      ) : null}

      {status.blockReason ? (
        <p className="mt-2 rounded-xl border border-[#7d2f2b] bg-[#7d2f2b]/25 p-3 text-sm">
          {status.blockReason}
        </p>
      ) : null}

      {overuse && (overuse.atThreshold || overuse.approaching) ? (
        <p className="mt-2 rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm">
          Used on <strong>{overuse.daysUsed} of the last 30 days</strong>.{" "}
          {overuse.atThreshold
            ? `That is at or above the ${overuse.threshold} days a month where regular use of this drug class can begin causing headaches of its own.`
            : `The threshold where this drug class can begin causing headaches of its own is ${overuse.threshold} days a month.`}{" "}
          Worth raising with the prescriber — this is a count, not a diagnosis.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={status.available ? "primary" : "secondary"}
          size="md"
          onClick={onTake}
          className="min-w-40 flex-1"
        >
          {status.available ? "Record a dose" : "Record anyway"}
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" onClick={onArchive}>
          {med.archived ? "Unarchive" : "Archive"}
        </Button>
        <Button variant="ghost" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted">
        Taken {status.takenToday}× today
        {med.maxPerDay !== undefined ? ` of ${med.maxPerDay} allowed` : ""}
        {last ? ` · last dose ${formatDateTime(last.at)}` : ""}
        {overuse ? ` · ${overuse.daysUsed} days used in the last 30` : ""}
      </p>
    </Card>
  );
}
