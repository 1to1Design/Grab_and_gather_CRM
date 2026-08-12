"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VERTICAL_ORDER } from "@/lib/constants";
import type { LeadStatus, Vertical } from "@prisma/client";

export type ImportRow = {
  organizationName: string;
  vertical: string;
  contactName?: string;
  contactTitle?: string;
  phone?: string;
  email?: string;
  footTrafficNotes?: string;
  notes?: string;
};

export async function importLeads(
  rows: ImportRow[]
): Promise<{ imported: number; skipped: number }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  const valid = rows.filter((r) => r.organizationName?.trim());

  const data = valid.map((r) => ({
    organizationName: r.organizationName.trim(),
    vertical: (VERTICAL_ORDER as string[]).includes(r.vertical) ? (r.vertical as Vertical) : ("OTHER" as Vertical),
    contactName: r.contactName?.trim() || null,
    contactTitle: r.contactTitle?.trim() || null,
    phone: r.phone?.trim() || null,
    email: r.email?.trim() || null,
    footTrafficNotes: r.footTrafficNotes?.trim() || null,
    notes: r.notes?.trim() || "",
    status: "NEW" as LeadStatus,
    createdById: session.user.id,
  }));

  if (data.length > 0) {
    await prisma.lead.createMany({ data });
  }

  revalidatePath("/");
  return { imported: data.length, skipped: rows.length - data.length };
}
