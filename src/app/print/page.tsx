import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, VERTICAL_LABELS, isStatus, isVertical } from "@/lib/constants";
import { SORT_OPTIONS, buildLeadOrderBy } from "@/lib/lead-sort";
import { buildLeadWhere } from "@/lib/lead-filters";
import { PrintTrigger } from "./print-trigger";

export default async function PrintPipelinePage({
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

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? SORT_OPTIONS[0].label;

  const filterSummary =
    [
      status && isStatus(status) ? `Status: ${STATUS_LABELS[status]}` : null,
      vertical && isVertical(vertical) ? `Vertical: ${VERTICAL_LABELS[vertical]}` : null,
      q ? `Search: "${q}"` : null,
      `Sort: ${sortLabel}`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="min-h-screen bg-white px-8 py-10 text-neutral-900 print:px-6 print:py-6">
      <PrintTrigger />

      <div className="mb-8 flex items-center justify-between border-b-4 border-amber-500 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Grab <span className="text-amber-500">&amp;</span> Gather
          </h1>
          <p className="text-sm text-neutral-500">Lead pipeline export — {filterSummary}</p>
        </div>
        <p className="text-right text-sm text-neutral-500">
          {new Date().toLocaleString()}
          <br />
          {leads.length} lead{leads.length === 1 ? "" : "s"}
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-3">Organization</th>
            <th className="py-2 pr-3">Vertical</th>
            <th className="py-2 pr-3">Contact</th>
            <th className="py-2 pr-3">Phone</th>
            <th className="py-2 pr-3">Address</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Next follow-up</th>
            <th className="py-2 pr-3">Last contacted</th>
            <th className="py-2 pr-3">Rep</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-neutral-200 print:break-inside-avoid">
              <td className="py-2 pr-3 font-medium">{lead.organizationName}</td>
              <td className="py-2 pr-3">{VERTICAL_LABELS[lead.vertical]}</td>
              <td className="py-2 pr-3">
                {lead.contactName ?? "—"}
                {lead.contactTitle ? ` (${lead.contactTitle})` : ""}
              </td>
              <td className="py-2 pr-3">{lead.phone ?? "—"}</td>
              <td className="py-2 pr-3">{lead.address ?? "—"}</td>
              <td className="py-2 pr-3">{STATUS_LABELS[lead.status]}</td>
              <td className="py-2 pr-3">
                {lead.nextFollowUpDate ? lead.nextFollowUpDate.toLocaleDateString() : "—"}
              </td>
              <td className="py-2 pr-3">
                {lead.lastContactedAt ? lead.lastContactedAt.toLocaleDateString() : "—"}
              </td>
              <td className="py-2 pr-3">{lead.createdBy.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {leads.length === 0 && <p className="mt-8 text-neutral-500">No leads match this filter.</p>}
    </div>
  );
}
