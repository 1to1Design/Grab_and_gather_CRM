import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const authKey = body?.keys?.auth;

  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof authKey !== "string") {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth: authKey, userId: session.user.id },
    update: { p256dh, auth: authKey, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
