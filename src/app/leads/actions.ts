"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadFormSchema } from "@/lib/lead-schema";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFollowUpDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readForm(formData: FormData) {
  return leadFormSchema.safeParse({
    organizationName: formData.get("organizationName"),
    vertical: formData.get("vertical"),
    contactName: formData.get("contactName") ?? "",
    contactTitle: formData.get("contactTitle") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
    nextFollowUpDate: formData.get("nextFollowUpDate") ?? "",
    footTrafficNotes: formData.get("footTrafficNotes") ?? "",
  });
}

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields." };
  }

  const data = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      organizationName: data.organizationName,
      vertical: data.vertical,
      contactName: data.contactName || null,
      contactTitle: data.contactTitle || null,
      phone: data.phone || null,
      email: data.email || null,
      status: data.status,
      notes: data.notes,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      footTrafficNotes: data.footTrafficNotes || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(
  id: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = readForm(formData);
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
      status: data.status,
      notes: data.notes,
      nextFollowUpDate: parseFollowUpDate(data.nextFollowUpDate),
      footTrafficNotes: data.footTrafficNotes || null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}
