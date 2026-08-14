"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadCreateSchema, leadFieldsSchema } from "@/lib/lead-schema";
import { formatNoteWithQuote, summarizeLeadNote } from "@/lib/summarize-note";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFollowUpDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readFields(formData: FormData) {
  return {
    organizationName: formData.get("organizationName"),
    vertical: formData.get("vertical"),
    contactName: formData.get("contactName") ?? "",
    contactTitle: formData.get("contactTitle") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    status: formData.get("status"),
    nextFollowUpDate: formData.get("nextFollowUpDate") ?? "",
    footTrafficNotes: formData.get("footTrafficNotes") ?? "",
  };
}

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = leadCreateSchema.safeParse({
    ...readFields(formData),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields." };
  }

  const data = parsed.data;
  const notes = data.notes.trim();

  let noteContent = "";
  if (notes) {
    const submittedSummary = String(formData.get("summary") ?? "").trim();
    const summary = submittedSummary || (await summarizeLeadNote(notes));
    noteContent = formatNoteWithQuote(summary, notes);
  }

  await prisma.lead.create({
    data: {
      organizationName: data.organizationName,
      vertical: data.vertical,
      contactName: data.contactName || null,
      contactTitle: data.contactTitle || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      status: data.status,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      footTrafficNotes: data.footTrafficNotes || null,
      createdById: session.user.id,
      lastContactedAt: noteContent ? new Date() : null,
      notes: noteContent ? { create: [{ content: noteContent, authorId: session.user.id }] } : undefined,
    },
  });

  revalidatePath("/");
  const intent = formData.get("intent");
  redirect(intent === "exit" ? "/" : "/leads/new");
}

export async function updateLead(
  id: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = leadFieldsSchema.safeParse(readFields(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields." };
  }

  const data = parsed.data;
  await prisma.lead.update({
    where: { id },
    data: {
      organizationName: data.organizationName,
      vertical: data.vertical,
      contactName: data.contactName || null,
      contactTitle: data.contactTitle || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      status: data.status,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      footTrafficNotes: data.footTrafficNotes || null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
  redirect("/");
}
