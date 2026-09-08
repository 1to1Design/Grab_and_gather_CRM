"use client";

import { useState } from "react";
import { Button, Card, Field, Select, TextArea, TextInput } from "./ui";
import { MED_CLASS_LABELS, MED_ROLE_LABELS } from "@/lib/medication";
import { newId } from "@/lib/defaults";
import type { MedClass, MedRole, Medication } from "@/lib/types";

/** Add or edit a prescription. Kept to what a helper needs to dose correctly. */
export function MedForm({
  existing,
  onSave,
  onCancel,
}: {
  existing?: Medication;
  onSave: (med: Medication) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [dose, setDose] = useState(existing?.dose ?? "");
  const [form, setForm] = useState(existing?.form ?? "tablet");
  const [role, setRole] = useState<MedRole>(existing?.role ?? "rescue");
  const [medClass, setMedClass] = useState<MedClass>(existing?.medClass ?? "other");
  const [asNeeded, setAsNeeded] = useState(
    existing ? existing.schedule.kind === "asNeeded" : true,
  );
  const [times, setTimes] = useState<string>(
    existing?.schedule.kind === "scheduled" ? existing.schedule.times.join(", ") : "08:00",
  );
  const [minHours, setMinHours] = useState<string>(
    existing?.schedule.kind === "asNeeded" && existing.schedule.minHoursBetween
      ? String(existing.schedule.minHoursBetween)
      : "",
  );
  const [maxPerDay, setMaxPerDay] = useState<string>(
    existing?.maxPerDay !== undefined ? String(existing.maxPerDay) : "",
  );
  const [maxPerWeek, setMaxPerWeek] = useState<string>(
    existing?.maxPerWeek !== undefined ? String(existing.maxPerWeek) : "",
  );
  const [prescriber, setPrescriber] = useState(existing?.prescriber ?? "");
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");

  function submit() {
    if (!name.trim()) return;
    const parsedTimes = times
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => t.padStart(5, "0"));

    onSave({
      id: existing?.id ?? newId(),
      name: name.trim(),
      dose: dose.trim(),
      form: form.trim(),
      role,
      medClass,
      schedule: asNeeded
        ? {
            kind: "asNeeded",
            minHoursBetween: minHours === "" ? undefined : Number(minHours),
          }
        : { kind: "scheduled", times: parsedTimes.length ? parsedTimes : ["08:00"] },
      maxPerDay: maxPerDay === "" ? undefined : Number(maxPerDay),
      maxPerWeek: maxPerWeek === "" ? undefined : Number(maxPerWeek),
      prescriber: prescriber.trim() || undefined,
      instructions: instructions.trim() || undefined,
      archived: existing?.archived ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <Card>
      <h3 className="mb-3 text-lg font-semibold">
        {existing ? `Edit ${existing.name}` : "Add a medication"}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sumatriptan"
              autoFocus
            />
          </Field>
        </div>
        <Field label="Dose">
          <TextInput value={dose} onChange={(e) => setDose(e.target.value)} placeholder="50 mg" />
        </Field>
        <Field label="Form">
          <TextInput
            value={form}
            onChange={(e) => setForm(e.target.value)}
            placeholder="tablet"
          />
        </Field>

        <Field label="When it is taken">
          <Select value={role} onChange={(e) => setRole(e.target.value as MedRole)}>
            {Object.entries(MED_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Type"
          hint="Used to track overuse limits, which differ by drug class"
        >
          <Select value={medClass} onChange={(e) => setMedClass(e.target.value as MedClass)}>
            {Object.entries(MED_CLASS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="col-span-2">
          <Field label="Schedule">
            <Select
              value={asNeeded ? "asNeeded" : "scheduled"}
              onChange={(e) => setAsNeeded(e.target.value === "asNeeded")}
            >
              <option value="asNeeded">Only when symptoms appear</option>
              <option value="scheduled">At fixed times every day</option>
            </Select>
          </Field>
        </div>

        {asNeeded ? (
          <Field label="Minimum hours between doses" hint="Leave blank if none">
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              placeholder="2"
            />
          </Field>
        ) : (
          <div className="col-span-2">
            <Field label="Times of day" hint="24-hour clock, comma separated: 08:00, 20:00">
              <TextInput value={times} onChange={(e) => setTimes(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Max per day" hint="The prescriber's ceiling">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            placeholder="2"
          />
        </Field>
        <Field label="Max per week">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPerWeek}
            onChange={(e) => setMaxPerWeek(e.target.value)}
          />
        </Field>

        <div className="col-span-2">
          <Field label="Prescribed by">
            <TextInput
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
              placeholder="Dr. Alvarez, neurology"
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Instructions for whoever helps" hint="Shown in bold on the dose screen">
            <TextArea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Take with food. Do not combine with the other triptan."
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={submit} disabled={!name.trim()}>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
