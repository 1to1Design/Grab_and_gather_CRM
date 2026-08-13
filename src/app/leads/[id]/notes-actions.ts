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

  await prisma.leadNote.create({
    data: { leadId, content, authorId: session.user.id },
  });

  revalidatePath(`/leads/${leadId}`);
  return {};
}
