"use client";

import { useActionState, useState } from "react";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  VERTICAL_LABELS,
  VERTICAL_ORDER,
} from "@/lib/constants";
import { VoiceDictateButton } from "@/components/voice-dictate-button";
import type { LeadFormState } from "@/app/leads/actions";

type FieldValues = {
  organizationName: string;
  vertical: string;
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  notes: string;
  nextFollowUpDate: string;
  footTrafficNotes: string;
};

const EMPTY: FieldValues = {
  organizationName: "",
  vertical: "OTHER",
  contactName: "",
  contactTitle: "",
  phone: "",
  email: "",
  address: "",
  status: "NEW",
  notes: "",
  nextFollowUpDate: "",
  footTrafficNotes: "",
};

export function LeadForm({
  action,
  initialValues,
  showVoiceCapture = false,
  submitLabel = "Save lead",
}: {
  action: (prevState: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  initialValues?: Partial<FieldValues>;
  showVoiceCapture?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [values, setValues] = useState<FieldValues>({ ...EMPTY, ...initialValues });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);

  function set<K extends keyof FieldValues>(key: K, value: FieldValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function appendNotes(text: string) {
    setValues((prev) => ({ ...prev, notes: prev.notes ? `${prev.notes} ${text}` : text }));
  }

  async function handleParse() {
    if (!values.notes.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/parse-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: values.notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Parsing failed.");
        if (data.phone || data.email) {
          setValues((prev) => ({
            ...prev,
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
          }));
        }
        return;
      }
      setValues((prev) => ({
        ...prev,
        organizationName: data.organizationName || prev.organizationName,
        vertical: data.vertical || prev.vertical,
        contactName: data.contactName || prev.contactName,
        contactTitle: data.contactTitle || prev.contactTitle,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
        address: data.address || prev.address,
        status: data.status || prev.status,
        nextFollowUpDate: data.nextFollowUpDate || prev.nextFollowUpDate,
        footTrafficNotes: data.footTrafficNotes || prev.footTrafficNotes,
      }));
      setParsed(true);
    } catch {
      setParseError("Couldn't reach the parser. You can still fill in the fields by hand.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {showVoiceCapture && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="notes" className="block text-sm font-medium text-amber-200">
              Voice note — talk it out, then tap Parse
            </label>
            <VoiceDictateButton onTranscript={appendNotes} />
          </div>
          <textarea
            id="notes"
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={6}
            autoFocus
            placeholder="Tap here, then tap the mic on your keyboard (or use the Dictate button) and just talk about how the meeting went…"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing || !values.notes.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {parsing ? "Parsing…" : "Parse into fields"}
            </button>
            {parsed && !parseError && (
              <span className="text-sm text-emerald-400">Fields filled in below — review before saving.</span>
            )}
            {parseError && <span className="text-sm text-red-400">{parseError}</span>}
          </div>
          <input type="hidden" name="notes" value={values.notes} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-neutral-300">
            Organization / location name
          </label>
          <input
            id="organizationName"
            name="organizationName"
            required
            value={values.organizationName}
            onChange={(e) => set("organizationName", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="vertical" className="mb-1 block text-sm font-medium text-neutral-300">
            Vertical
          </label>
          <select
            id="vertical"
            name="vertical"
            value={values.vertical}
            onChange={(e) => set("vertical", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          >
            {VERTICAL_ORDER.map((v) => (
              <option key={v} value={v}>
                {VERTICAL_LABELS[v]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contactName" className="mb-1 block text-sm font-medium text-neutral-300">
            Contact name
          </label>
          <input
            id="contactName"
            name="contactName"
            value={values.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="contactTitle" className="mb-1 block text-sm font-medium text-neutral-300">
            Contact title / role
          </label>
          <input
            id="contactTitle"
            name="contactTitle"
            value={values.contactTitle}
            onChange={(e) => set("contactTitle", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-300">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-neutral-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nextFollowUpDate" className="mb-1 block text-sm font-medium text-neutral-300">
            Next follow-up date
          </label>
          <input
            id="nextFollowUpDate"
            name="nextFollowUpDate"
            type="date"
            value={values.nextFollowUpDate}
            onChange={(e) => set("nextFollowUpDate", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-neutral-300">
          Address
        </label>
        <input
          id="address"
          name="address"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Street, city, state"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label htmlFor="footTrafficNotes" className="mb-1 block text-sm font-medium text-neutral-300">
          Foot traffic / lead quality notes
        </label>
        <textarea
          id="footTrafficNotes"
          name="footTrafficNotes"
          value={values.footTrafficNotes}
          onChange={(e) => set("footTrafficNotes", e.target.value)}
          rows={2}
          placeholder="e.g. ~150 unique visitors/day, 800 Google reviews"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {showVoiceCapture ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="intent"
            value="exit"
            disabled={pending}
            className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-200 transition hover:bg-neutral-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save and Exit"}
          </button>
          <button
            type="submit"
            name="intent"
            value="addNew"
            disabled={pending}
            className="rounded-lg bg-amber-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save and Add New"}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      )}
    </form>
  );
}
