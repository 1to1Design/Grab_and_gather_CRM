import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeadForm } from "@/components/lead-form";
import { MeetingNotes } from "@/components/meeting-notes";
import { updateLead } from "@/app/leads/actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!lead) notFound();

  const boundUpdate = updateLead.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-300">
        ← Back to pipeline
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-white">{lead.organizationName}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Logged {lead.dateLogged.toLocaleDateString()} by {lead.createdBy.name}
      </p>

      <LeadForm
        action={boundUpdate}
        initialValues={{
          organizationName: lead.organizationName,
          vertical: lead.vertical,
          contactName: lead.contactName ?? "",
          contactTitle: lead.contactTitle ?? "",
          phone: lead.phone ?? "",
          email: lead.email ?? "",
          address: lead.address ?? "",
          status: lead.status,
          leadQuality: lead.leadQuality,
          nextFollowUpDate: lead.nextFollowUpDate
            ? lead.nextFollowUpDate.toISOString().slice(0, 10)
            : "",
          footTrafficNotes: lead.footTrafficNotes ?? "",
          financialModelUrl: lead.financialModelUrl ?? "",
          placementAgreementUrl: lead.placementAgreementUrl ?? "",
        }}
        submitLabel="Save changes"
      />

      <MeetingNotes
        leadId={lead.id}
        notes={lead.notes.map((note) => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          author: note.author,
        }))}
      />
    </div>
  );
}
