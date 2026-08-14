import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { TERMINAL_STATUSES } from "@/lib/constants";

// Fired once a day by Vercel Cron (see vercel.json). Sends each rep a single
// digest push covering every lead they own that's due for follow-up today
// or overdue — not a push per lead, so nobody gets spammed.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueLeads = await prisma.lead.findMany({
    where: {
      nextFollowUpDate: { lte: new Date() },
      status: { notIn: TERMINAL_STATUSES },
    },
    select: { organizationName: true, createdById: true },
  });

  const byRep = new Map<string, string[]>();
  for (const lead of dueLeads) {
    const names = byRep.get(lead.createdById) ?? [];
    names.push(lead.organizationName);
    byRep.set(lead.createdById, names);
  }

  let repsNotified = 0;
  for (const [userId, names] of byRep) {
    const count = names.length;
    const preview = names.slice(0, 3).join(", ");
    const more = count > 3 ? ` +${count - 3} more` : "";

    await sendPushToUser(userId, {
      title: count === 1 ? "1 follow-up due" : `${count} follow-ups due`,
      body: `${preview}${more}`,
      url: "/",
    });
    repsNotified++;
  }

  return NextResponse.json({ dueLeads: dueLeads.length, repsNotified });
}
