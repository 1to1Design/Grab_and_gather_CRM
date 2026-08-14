import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_COLORS, STATUS_LABELS, VERTICAL_LABELS } from "@/lib/constants";
import { buildLeadOrderBy } from "@/lib/lead-sort";
import { buildLeadWhere } from "@/lib/lead-filters";
import { PipelineFilters } from "@/components/pipeline-filters";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vertical?: string; q?: string; sort?: string }>;
}) {
  const { status, vertical, q, sort } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: buildLeadWhere({ status, vertical, q }),
    orderBy: buildLeadOrderBy(sort ?? ""),
    include: { createdBy: { select: { name: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const printParams = new URLSearchParams();
  if (status) printParams.set("status", status);
  if (vertical) printParams.set("vertical", vertical);
  if (q) printParams.set("q", q);
  if (sort) printParams.set("sort", sort);
  const printHref = printParams.toString() ? `/print?${printParams.toString()}` : "/print";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline</h1>
          <p className="text-sm text-neutral-500">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={printHref}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
          >
            Export PDF
          </Link>
          <Link
            href="/leads/new"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400"
          >
            + New lead
          </Link>
        </div>
      </div>

      <PipelineFilters
        initialQ={q ?? ""}
        initialStatus={status ?? ""}
        initialVertical={vertical ?? ""}
        initialSort={sort ?? ""}
      />

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-16 text-center text-neutral-500">
          No leads match yet.{" "}
          <Link href="/leads/new" className="text-amber-500 hover:underline">
            Log your first one
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => {
            const overdue =
              lead.nextFollowUpDate &&
              lead.nextFollowUpDate < today &&
              lead.status !== "PLACED_WON" &&
              lead.status !== "PASSED";
            const mapsHref = lead.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
              : null;

            return (
              <li
                key={lead.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-white">{lead.organizationName}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[lead.status]}`}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-neutral-400">
                      {VERTICAL_LABELS[lead.vertical]}
                      {lead.contactName ? ` · ${lead.contactName}` : ""}
                      {lead.contactTitle ? ` (${lead.contactTitle})` : ""}
                    </p>
                  </Link>

                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    {lead.nextFollowUpDate && (
                      <span className={overdue ? "text-red-400" : "text-neutral-400"}>
                        Follow up {lead.nextFollowUpDate.toLocaleDateString()}
                      </span>
                    )}
                    {lead.lastContactedAt && (
                      <span className="text-neutral-500">
                        Last contact {lead.lastContactedAt.toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-neutral-600">{lead.createdBy.name}</span>
                  </div>
                </div>

                {(lead.phone || mapsHref) && (
                  <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-neutral-800 pt-2 text-xs">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
                        </svg>
                        {lead.phone}
                      </a>
                    )}
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {lead.address}
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
