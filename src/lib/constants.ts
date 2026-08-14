import { LeadQuality, LeadStatus, Vertical } from "@prisma/client";

export const VERTICAL_LABELS: Record<Vertical, string> = {
  GYM_FITNESS: "Gym / Fitness",
  URGENT_CARE_MEDICAL: "Urgent Care / Medical",
  COWORKING_OFFICE: "Coworking / Office",
  APARTMENT_COMPLEX: "Apartment Complex",
  WAREHOUSE_MANUFACTURING: "Warehouse / Manufacturing",
  SCHOOL_DISTRICT: "School District",
  DEALERSHIP: "Dealership",
  OTHER: "Other",
};

export const VERTICAL_ORDER: Vertical[] = [
  "GYM_FITNESS",
  "URGENT_CARE_MEDICAL",
  "COWORKING_OFFICE",
  "APARTMENT_COMPLEX",
  "WAREHOUSE_MANUFACTURING",
  "SCHOOL_DISTRICT",
  "DEALERSHIP",
  "OTHER",
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP_NEEDED: "Follow-up needed",
  MEETING_SCHEDULED: "Meeting scheduled",
  PLACED_WON: "Placed / Won",
  PASSED: "Passed",
  LOST: "Lost",
};

export const STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP_NEEDED",
  "MEETING_SCHEDULED",
  "PLACED_WON",
  "PASSED",
  "LOST",
];

// Leads marked Lost are hidden from the default pipeline view (no status
// filter selected) — they only show up when Lost is explicitly selected.
export const HIDDEN_BY_DEFAULT_STATUS: LeadStatus = "LOST";

// Closed-out leads don't need follow-up reminders anymore.
export const TERMINAL_STATUSES: LeadStatus[] = ["PLACED_WON", "PASSED", "LOST"];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  CONTACTED: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  FOLLOW_UP_NEEDED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  MEETING_SCHEDULED: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  PLACED_WON: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  PASSED: "bg-neutral-600/15 text-neutral-400 border-neutral-600/30",
  LOST: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function isStatus(value: string): value is LeadStatus {
  return (STATUS_ORDER as string[]).includes(value);
}

export function isVertical(value: string): value is Vertical {
  return (VERTICAL_ORDER as string[]).includes(value);
}

// Matches the scoring convention: ~100/day minimum to qualify, 500+
// reviews as a proxy for "high volume", 2,000+ for "mega-traffic".
// Declared worst-to-best — see the matching comment in schema.prisma.
export const LEAD_QUALITY_LABELS: Record<LeadQuality, string> = {
  UNRATED: "Not rated",
  BELOW_THRESHOLD: "Below threshold",
  QUALIFIED: "Qualified",
  HIGH_VOLUME: "High volume",
  MEGA_TRAFFIC: "Mega traffic",
};

export const LEAD_QUALITY_ORDER: LeadQuality[] = [
  "UNRATED",
  "BELOW_THRESHOLD",
  "QUALIFIED",
  "HIGH_VOLUME",
  "MEGA_TRAFFIC",
];

export const LEAD_QUALITY_COLORS: Record<LeadQuality, string> = {
  UNRATED: "bg-neutral-600/15 text-neutral-400 border-neutral-600/30",
  BELOW_THRESHOLD: "bg-red-500/15 text-red-300 border-red-500/30",
  QUALIFIED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  HIGH_VOLUME: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  MEGA_TRAFFIC: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function isLeadQuality(value: string): value is LeadQuality {
  return (LEAD_QUALITY_ORDER as string[]).includes(value);
}
