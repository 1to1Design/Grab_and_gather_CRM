"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, STATUS_ORDER, VERTICAL_LABELS, VERTICAL_ORDER } from "@/lib/constants";
import { SORT_OPTIONS } from "@/lib/lead-sort";

const DEFAULT_SORT = SORT_OPTIONS[0].value;

export function PipelineFilters({
  initialQ,
  initialStatus,
  initialVertical,
  initialSort,
}: {
  initialQ: string;
  initialStatus: string;
  initialVertical: string;
  initialSort: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [vertical, setVertical] = useState(initialVertical);
  const [sort, setSort] = useState(initialSort || DEFAULT_SORT);

  function navigate(next: { q?: string; status?: string; vertical?: string; sort?: string }) {
    const nq = next.q ?? q;
    const nstatus = next.status ?? status;
    const nvertical = next.vertical ?? vertical;
    const nsort = next.sort ?? sort;
    const params = new URLSearchParams();
    if (nq) params.set("q", nq);
    if (nstatus) params.set("status", nstatus);
    if (nvertical) params.set("vertical", nvertical);
    if (nsort && nsort !== DEFAULT_SORT) params.set("sort", nsort);
    router.push(params.toString() ? `/?${params.toString()}` : "/");
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    navigate({ status: value });
  }

  function handleVerticalChange(value: string) {
    setVertical(value);
    navigate({ vertical: value });
  }

  function handleSortChange(value: string) {
    setSort(value);
    navigate({ sort: value });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") navigate({ q });
  }

  function handleClear() {
    setQ("");
    setStatus("");
    setVertical("");
    navigate({ q: "", status: "", vertical: "" });
  }

  const hasFilters = Boolean(q || status || vertical);

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search org or contact… (Enter to search)"
        className="min-w-[180px] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
      />
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
      >
        <option value="">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        value={vertical}
        onChange={(e) => handleVerticalChange(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
      >
        <option value="">All verticals</option>
        {VERTICAL_ORDER.map((v) => (
          <option key={v} value={v}>
            {VERTICAL_LABELS[v]}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleClear}
        disabled={!hasFilters}
        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
      >
        Clear filter
      </button>
    </div>
  );
}
