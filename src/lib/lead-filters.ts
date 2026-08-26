import { Prisma } from "@prisma/client";
import {
  HIDDEN_BY_DEFAULT_STATUS,
  TERMINAL_STATUSES,
  isLeadQuality,
  isStatus,
  isVertical,
} from "@/lib/constants";

export function buildLeadWhere(filters: {
  status?: string;
  vertical?: string;
  quality?: string;
  q?: string;
  overdue?: boolean;
  dueToday?: boolean;
  createdById?: string;
}): Prisma.LeadWhereInput {
  const { status, vertical, quality, q, overdue, dueToday, createdById } = filters;
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

  // Quick views from the pipeline's overdue/due-today banner — matches the
  // scoping of the counts shown there (this rep's own leads only).
  if (overdue || dueToday) {
    where.status = { notIn: TERMINAL_STATUSES };
    if (createdById) where.createdById = createdById;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (overdue) {
      where.nextFollowUpDate = { lt: today };
    } else if (dueToday) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.nextFollowUpDate = { gte: today, lt: tomorrow };
    }
  }

  return where;
}
