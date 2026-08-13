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
  address?: string;
  footTrafficNotes?: string;
  notes?: string;
};

export async function importLeads(
  rows: ImportRow[]
): Promise<{ imported: number; skipped: number }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");

  const valid = rows.filter((r) => r.organizationName?.trim());
  const authorId = session.user.id;

  if (valid.length > 0) {
    await prisma.$transaction(
      valid.map((r) => {
        const notes = r.notes?.trim();
        return prisma.lead.create({
          data: {
            organizationName: r.organizationName.trim(),
            vertical: (VERTICAL_ORDER as string[]).includes(r.vertical)
              ? (r.vertical as Vertical)
              : ("OTHER" as Vertical),
            contactName: r.contactName?.trim() || null,
            contactTitle: r.contactTitle?.trim() || null,
            phone: r.phone?.trim() || null,
            email: r.email?.trim() || null,
            address: r.address?.trim() || null,
            footTrafficNotes: r.footTrafficNotes?.trim() || null,
            status: "NEW" as LeadStatus,
            createdById: authorId,
            notes: notes ? { create: [{ content: notes, authorId }] } : undefined,
          },
        });
      })
    );
  }

  revalidatePath("/");
  return { imported: valid.length, skipped: rows.length - valid.length };
}
