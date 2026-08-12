import Link from "next/link";
import { LeadStatus, Prisma, Vertical } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  VERTICAL_LABELS,
  VERTICAL_ORDER,
} from "@/lib/constants";

function isStatus(value: string): value is LeadStatus {
  return (STATUS_ORDER as string[]).includes(value);
}

function isVertical(value: string): value is Vertical {
  return (VERTICAL_ORDER as string[]).includes(value);
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vertical?: string; q?: string }>;
}) {
  const { status, vertical, q } = await searchParams;

  const where: Prisma.LeadWhereInput = {};
  if (status && isStatus(status)) where.status = status;
  if (vertical && isVertical(vertical)) where.vertical = vertical;
  if (q) {
    where.OR = [
      { organizationName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ nextFollowUpDate: { sort: "asc", nulls: "last" } }, { dateLogged: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline</h1>
          <p className="text-sm text-neutral-500">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400"
        >
          + New lead
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search org or contact…"
          className="min-w-[180px] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
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
          name="vertical"
          defaultValue={vertical ?? ""}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
        >
          <option value="">All verticals</option>
          {VERTICAL_ORDER.map((v) => (
            <option key={v} value={v}>
              {VERTICAL_LABELS[v]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
        >
          Filter
        </button>
      </form>

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

            return (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
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
                  </div>

                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    {lead.nextFollowUpDate && (
                      <span className={overdue ? "text-red-400" : "text-neutral-400"}>
                        Follow up {lead.nextFollowUpDate.toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-neutral-600">{lead.createdBy.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
