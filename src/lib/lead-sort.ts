import { Prisma } from "@prisma/client";

export const SORT_OPTIONS = [
  { value: "followup", label: "Follow-up date" },
  { value: "contacted", label: "Last contacted" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((o) => o.value === value);
}

export function buildLeadOrderBy(sort: string): Prisma.LeadOrderByWithRelationInput[] {
  if (sort === "contacted") {
    return [{ lastContactedAt: { sort: "desc", nulls: "last" } }, { dateLogged: "desc" }];
  }
  return [{ nextFollowUpDate: { sort: "asc", nulls: "last" } }, { dateLogged: "desc" }];
}
