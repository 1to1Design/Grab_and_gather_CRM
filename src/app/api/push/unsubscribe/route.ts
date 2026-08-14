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
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
