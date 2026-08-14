import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findSimilarNames, normalizeName } from "@/lib/similarity";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (normalizeName(name).length < 3) {
    return NextResponse.json({ matches: [] });
  }

  // Fetching id + name for every lead is fine at the scale this app runs
  // at (a real trigram/fuzzy index in Postgres would be the move once the
  // lead count gets into the tens of thousands).
  const leads = await prisma.lead.findMany({
    select: { id: true, organizationName: true },
  });

  const matches = findSimilarNames(name, leads).slice(0, 3);
  return NextResponse.json({ matches });
}
