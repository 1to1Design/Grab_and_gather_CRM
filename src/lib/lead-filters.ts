import { Prisma } from "@prisma/client";
import { HIDDEN_BY_DEFAULT_STATUS, isLeadQuality, isStatus, isVertical } from "@/lib/constants";

export function buildLeadWhere(filters: {
  status?: string;
  vertical?: string;
  quality?: string;
  q?: string;
}): Prisma.LeadWhereInput {
  const { status, vertical, quality, q } = filters;
  const where: Prisma.LeadWhereInput = {};

  if (status && isStatus(status)) {
    where.status = status;
  } else {
    // No status explicitly picked ("All statuses") — leave out Lost leads
    // unless someone specifically filters for them.
    where.status = { not: HIDDEN_BY_DEFAULT_STATUS };
  }

  if (vertical && isVertical(vertical)) where.vertical = vertical;
  if (quality && isLeadQuality(quality)) where.leadQuality = quality;

  if (q) {
    where.OR = [
      { organizationName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}
