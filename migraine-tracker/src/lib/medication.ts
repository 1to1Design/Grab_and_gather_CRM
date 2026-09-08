/**
 * Medication helpers: what is due, what is safe to take again, and whether
 * acute medication use is creeping toward the level that can itself start
 * causing headaches.
 *
 * The overuse thresholds below come from the International Classification of
 * Headache Disorders, 3rd edition (ICHD-3), section 8.2 "Medication-overuse
 * headache": triptans, ergotamines, opioids and combination analgesics are
 * defined at 10 or more days per month for more than three months, while
 * simple analgesics (acetaminophen, aspirin, other NSAIDs) are defined at 15
 * or more days per month over the same period.
 * Source: https://ichd-3.org/8-headache-attributed-to-a-substance-or-its-withdrawal/8-2-medication-overuse-headache-moh/
 *
 * This is a counting aid for a conversation with a prescriber, not a
 * diagnosis. The full ICHD-3 criteria also require a pre-existing headache
 * disorder and headache on 15 or more days a month, which this app does not
 * attempt to judge.
 */

import type { DoseEvent, MedClass, Medication } from "./types";
import { dayKey } from "./analysis";

/** Days-per-month at which ICHD-3 places the overuse threshold, by class. */
const OVERUSE_DAYS_PER_MONTH: Partial<Record<MedClass, number>> = {
  triptan: 10,
  ergotamine: 10,
  opioid: 10,
  combination: 10,
  simpleAnalgesic: 15,
  nsaid: 15,
};

export const MED_CLASS_LABELS: Record<MedClass, string> = {
  triptan: "Triptan (sumatriptan, rizatriptan…)",
  ergotamine: "Ergotamine",
  opioid: "Opioid",
  combination: "Combination pain reliever (e.g. Excedrin)",
  simpleAnalgesic: "Simple pain reliever (acetaminophen, aspirin)",
  nsaid: "NSAID (ibuprofen, naproxen)",
  gepant: "Gepant (ubrogepant, rimegepant…)",
  antiemetic: "Anti-nausea medication",
  preventiveDaily: "Daily preventive",
  other: "Other",
};

export const MED_ROLE_LABELS = {
  rescue: "Rescue — taken during an attack",
  preventive: "Preventive — taken on a schedule",
  other: "Other",
} as const;

function withinDays(iso: string, days: number, now: Date) {
  return now.getTime() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

/** Distinct calendar days a medication was taken in the last 30 days. */
export function daysUsedInLast30(
  medId: string,
  doses: DoseEvent[],
  now = new Date(),
): number {
  const days = new Set(
    doses
      .filter((d) => d.medId === medId && withinDays(d.at, 30, now))
      .map((d) => dayKey(d.at)),
  );
  return days.size;
}

export type OveruseStatus = {
  threshold: number;
  daysUsed: number;
  /** At or past the ICHD-3 days-per-month figure for this class. */
  atThreshold: boolean;
  /** Within two days of it — early enough to change course. */
  approaching: boolean;
};

export function overuseStatus(
  med: Medication,
  doses: DoseEvent[],
  now = new Date(),
): OveruseStatus | null {
  const threshold = OVERUSE_DAYS_PER_MONTH[med.medClass];
  // Gepants, anti-nausea medication and daily preventives are not part of the
  // ICHD-3 overuse definition, so no threshold is asserted for them.
  if (!threshold) return null;

  const daysUsed = daysUsedInLast30(med.id, doses, now);
  return {
    threshold,
    daysUsed,
    atThreshold: daysUsed >= threshold,
    approaching: daysUsed >= threshold - 2 && daysUsed < threshold,
  };
}

export function dosesToday(
  medId: string,
  doses: DoseEvent[],
  now = new Date(),
): DoseEvent[] {
  const today = dayKey(now.toISOString());
  return doses.filter((d) => d.medId === medId && dayKey(d.at) === today);
}

export function lastDose(medId: string, doses: DoseEvent[]): DoseEvent | null {
  const sorted = doses
    .filter((d) => d.medId === medId)
    .sort((a, b) => b.at.localeCompare(a.at));
  return sorted[0] ?? null;
}

export type MedStatus = {
  med: Medication;
  takenToday: number;
  last: DoseEvent | null;
  /** Safe and appropriate to take right now, as far as the app can tell. */
  available: boolean;
  /** One line a helper can act on without interpreting anything. */
  summary: string;
  /** Set when the app is actively telling someone not to give a dose. */
  blockReason?: string;
  overuse: OveruseStatus | null;
  /** For scheduled meds, the next clock time still to come today. */
  nextScheduled?: string;
};

function minutesUntil(time: string, now: Date): number {
  const [hours, minutes] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return (target.getTime() - now.getTime()) / 60000;
}

function formatClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Turns a medication plus its dose history into a single unambiguous state.
 * A caregiver should be able to read `summary` and act without deciding
 * anything, which is why every branch resolves to a plain sentence.
 */
export function medStatus(
  med: Medication,
  doses: DoseEvent[],
  now = new Date(),
): MedStatus {
  const today = dosesToday(med.id, doses, now);
  const last = lastDose(med.id, doses);
  const overuse = overuseStatus(med, doses, now);

  const base = { med, takenToday: today.length, last, overuse };

  if (med.maxPerDay !== undefined && today.length >= med.maxPerDay) {
    return {
      ...base,
      available: false,
      summary: `Daily limit reached (${today.length} of ${med.maxPerDay})`,
      blockReason: `The prescribed limit is ${med.maxPerDay} per day and that has been reached. Do not give another dose today without checking with the prescriber.`,
    };
  }

  if (med.maxPerWeek !== undefined) {
    const week = doses.filter(
      (d) => d.medId === med.id && withinDays(d.at, 7, now),
    ).length;
    if (week >= med.maxPerWeek) {
      return {
        ...base,
        available: false,
        summary: `Weekly limit reached (${week} of ${med.maxPerWeek})`,
        blockReason: `The prescribed limit is ${med.maxPerWeek} per week and that has been reached. Check with the prescriber before giving another dose.`,
      };
    }
  }

  if (med.schedule.kind === "asNeeded") {
    const gap = med.schedule.minHoursBetween;
    if (gap && last) {
      const hoursSince = (now.getTime() - new Date(last.at).getTime()) / 3600000;
      if (hoursSince < gap) {
        const wait = gap - hoursSince;
        const readyAt = new Date(now.getTime() + wait * 3600000);
        return {
          ...base,
          available: false,
          summary: `Too soon — next dose after ${readyAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
          blockReason: `Doses must be at least ${gap} hours apart. The last one was ${hoursSince.toFixed(1)} hours ago.`,
        };
      }
    }
    return {
      ...base,
      available: true,
      summary: last
        ? `As needed — last taken ${new Date(last.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
        : "As needed — not taken yet",
    };
  }

  // Scheduled medication: due when a scheduled time has passed and no dose has
  // been recorded for it yet.
  const times = [...med.schedule.times].sort();
  const passedTimes = times.filter((t) => minutesUntil(t, now) <= 5);
  const upcoming = times.find((t) => minutesUntil(t, now) > 5);

  if (today.length < passedTimes.length) {
    return {
      ...base,
      available: true,
      summary: `Due now — ${passedTimes[today.length] ? formatClock(passedTimes[today.length]) : "scheduled"} dose not yet given`,
      nextScheduled: upcoming,
    };
  }

  return {
    ...base,
    available: true,
    summary: upcoming
      ? `Next dose at ${formatClock(upcoming)}`
      : `All ${times.length} doses given today`,
    nextScheduled: upcoming,
  };
}

/** Sorts what a helper should look at first: due now, then everything else. */
export function sortForCaregiver(statuses: MedStatus[]): MedStatus[] {
  const weight = (s: MedStatus) => {
    if (s.summary.startsWith("Due now")) return 0;
    if (s.med.role === "rescue" && s.available) return 1;
    if (s.available) return 2;
    return 3;
  };
  return [...statuses].sort((a, b) => weight(a) - weight(b));
}
