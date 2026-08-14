"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function addLeadNote(
  leadId: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Note can't be empty." };

  const now = new Date();
  await prisma.$transaction([
    prisma.leadNote.create({
      data: { leadId, content, authorId: session.user.id, createdAt: now },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: now },
    }),
  ]);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return {};
}
