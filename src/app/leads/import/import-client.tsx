"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { VERTICAL_LABELS, VERTICAL_ORDER } from "@/lib/constants";
import { importLeads, type ImportRow } from "./actions";

const TARGET_FIELDS: { key: keyof ImportRow; label: string; required?: boolean }[] = [
  { key: "organizationName", label: "Organization / location name", required: true },
  { key: "contactName", label: "Contact name" },
  { key: "contactTitle", label: "Contact title / role" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "footTrafficNotes", label: "Foot traffic / quality notes" },
  { key: "notes", label: "Notes" },
];

const NONE = "__none__";

// Checked in order; more specific fields first so e.g. "Contact Name" isn't
// claimed by the generic "name" fallback used for organizationName.
const GUESS_KEYWORDS: Partial<Record<keyof ImportRow, string[]>> = {
  contactName: ["contact name", "contact person", "contact"],
  contactTitle: ["title", "role", "position"],
  phone: ["phone", "cell", "tel"],
  email: ["email", "e-mail"],
  address: ["address", "street", "location"],
  footTrafficNotes: ["review", "traffic", "visitor", "rating", "volume"],
  notes: ["note", "comment"],
  organizationName: ["organization", "business name", "facility", "gym", "clinic", "name"],
};

// organizationName is guessed last (its "name" keyword is a broad fallback
// that would otherwise steal columns like "Contact Name").
const GUESS_ORDER: (keyof ImportRow)[] = [
  "contactName",
  "contactTitle",
  "phone",
  "email",
  "address",
  "footTrafficNotes",
  "notes",
  "organizationName",
];

function guessMapping(headers: string[]): Record<string, string> {
  const guessed: Record<string, string> = {};
  const claimed = new Set<string>();

  for (const key of GUESS_ORDER) {
    const keywords = GUESS_KEYWORDS[key] ?? [];
    const match = headers.find(
      (h) => !claimed.has(h) && keywords.some((kw) => h.toLowerCase().includes(kw))
    );
    guessed[key] = match ?? NONE;
    if (match) claimed.add(match);
  }

  return guessed;
}

export function ImportClient() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultVertical, setDefaultVertical] = useState<string>(VERTICAL_ORDER[0]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    duplicateWarnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        setHeaders(fields);
        setRows(results.data);
        setMapping(guessMapping(fields));
      },
      error: (err) => setError(err.message),
    });
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const mapped: ImportRow[] = rows.map((row) => {
        const get = (key: keyof ImportRow) => {
          const col = mapping[key];
          return col && col !== NONE ? row[col] ?? "" : "";
        };
        return {
          organizationName: get("organizationName"),
          vertical: defaultVertical,
          contactName: get("contactName"),
          contactTitle: get("contactTitle"),
          phone: get("phone"),
          email: get("email"),
          address: get("address"),
          footTrafficNotes: get("footTrafficNotes"),
          notes: get("notes"),
        };
      });

      const res = await importLeads(mapped);
      setResult(res);
    } catch {
      setError("Import failed. Nothing was saved — check your file and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">CSV file</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-amber-400"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Works with your existing urgent care or gym spreadsheets exported as CSV.
        </p>
      </div>

      {headers.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-white">Map columns ({rows.length} rows found)</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              This whole file is which vertical?
            </label>
            <select
              value={defaultVertical}
              onChange={(e) => setDefaultVertical(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
            >
              {VERTICAL_ORDER.map((v) => (
                <option key={v} value={v}>
                  {VERTICAL_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-56 shrink-0 text-sm text-neutral-300">
                  {field.label}
                  {field.required && <span className="text-amber-500"> *</span>}
                </label>
                <select
                  value={mapping[field.key] ?? NONE}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value={NONE}>— don&apos;t import —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || mapping.organizationName === NONE}
            className="mt-6 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${rows.length} leads`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
            Imported {result.imported} lead{result.imported === 1 ? "" : "s"}.
            {result.skipped > 0 && ` Skipped ${result.skipped} row(s) with no organization name.`}{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="ml-2 underline hover:text-emerald-200"
            >
              View pipeline
            </button>
          </div>
          {result.duplicateWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
              <p className="mb-2 font-medium">
                {result.duplicateWarnings.length} row{result.duplicateWarnings.length === 1 ? "" : "s"} looked
                similar to leads that already existed — worth a quick check for duplicates:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {result.duplicateWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
