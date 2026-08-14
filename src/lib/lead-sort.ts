import { Prisma } from "@prisma/client";

export const SORT_OPTIONS = [
  { value: "followup", label: "Follow-up date" },
  { value: "contacted", label: "Last contacted" },
  { value: "quality", label: "Lead quality" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((o) => o.value === value);
}

export function buildLeadOrderBy(sort: string): Prisma.LeadOrderByWithRelationInput[] {
  if (sort === "contacted") {
    return [{ lastContactedAt: { sort: "desc", nulls: "last" } }, { dateLogged: "desc" }];
  }
  if (sort === "quality") {
    // Enum declaration order runs worst-to-best, so desc surfaces the most
    // promising leads first.
    return [{ leadQuality: "desc" }, { dateLogged: "desc" }];
  }
  return [{ nextFollowUpDate: { sort: "asc", nulls: "last" } }, { dateLogged: "desc" }];
}
