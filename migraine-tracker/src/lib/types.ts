/**
 * Every record the app stores lives on the user's own device. Nothing here is
 * ever sent to a server, which is why the shapes below carry no user ids and
 * no account concept.
 */

/** A 0-10 rating. 0 = none, 10 = worst imaginable. */
export type Score = number;

/** One thing the user tracks, e.g. "Head pain". Users can add their own. */
export type Tracker = {
  id: string;
  label: string;
  /** Shown under the label so a caregiver knows what the number means. */
  hint: string;
  /** Hidden trackers stay in the data but drop off the logging screen. */
  enabled: boolean;
  /** Built-in trackers can be disabled but not deleted. */
  builtIn: boolean;
};

/** A single point-in-time log of how the person feels. */
export type SymptomEntry = {
  id: string;
  /** ISO timestamp of the moment being described. */
  at: string;
  /** trackerId -> 0-10. Missing keys mean "not rated this time". */
  scores: Record<string, Score>;
  /** Free-text context: what they were doing, what helped, aura details. */
  notes: string;
  /** Optional lifestyle context that is known to interact with migraine. */
  context: EntryContext;
  createdAt: string;
  updatedAt: string;
};

export type EntryContext = {
  /** Hours slept the night before. */
  sleepHours?: number;
  /** 0-10 self-rated stress. */
  stress?: Score;
  /** Glasses of water so far today. */
  water?: number;
  /** Meals skipped today. */
  skippedMeals?: number;
  /** Menstrual cycle day, 1 = first day of period. Blank if not tracking. */
  cycleDay?: number;
  /** Free tags the user picks: "red wine", "screen time", "travel". */
  tags?: string[];
};

/** How a medication is meant to be used, so a helper can dose correctly. */
export type MedSchedule =
  /** Taken on a fixed clock schedule regardless of symptoms. */
  | { kind: "scheduled"; times: string[] }
  /** Taken only when symptoms appear. */
  | { kind: "asNeeded"; minHoursBetween?: number };

/** Preventive meds are taken daily; rescue meds are taken during an attack. */
export type MedRole = "preventive" | "rescue" | "other";

/**
 * The medication class matters because the threshold at which acute
 * medication can itself start causing headaches differs by class.
 * See ICHD-3 section 8.2 (referenced in lib/medication.ts).
 */
export type MedClass =
  | "triptan"
  | "ergotamine"
  | "opioid"
  | "combination"
  | "simpleAnalgesic"
  | "nsaid"
  | "gepant"
  | "antiemetic"
  | "preventiveDaily"
  | "other";

export type Medication = {
  id: string;
  name: string;
  /** e.g. "50 mg", "1 tablet", "4 mg/mL". */
  dose: string;
  /** e.g. "tablet", "nasal spray", "injection". */
  form: string;
  role: MedRole;
  medClass: MedClass;
  schedule: MedSchedule;
  /** Hard ceiling the prescriber set, e.g. 2 doses in 24h. */
  maxPerDay?: number;
  /** Hard ceiling per week, if the prescriber set one. */
  maxPerWeek?: number;
  /** Who prescribed it, so the doctor report can attribute it. */
  prescriber?: string;
  /** Anything a helper needs to know: "take with food", "may cause drowsiness". */
  instructions?: string;
  /** Archived meds stay in history but leave the active list. */
  archived: boolean;
  createdAt: string;
};

/** A recorded dose. This is the log a caregiver builds by tapping "Taken". */
export type DoseEvent = {
  id: string;
  medId: string;
  at: string;
  /** Who administered it, for households where several people help. */
  givenBy?: string;
  notes?: string;
};

/**
 * One hour of environmental conditions at the user's location. Keyed by hour
 * so repeated syncs overwrite rather than duplicate.
 */
export type EnvReading = {
  /** Local hour in "YYYY-MM-DDTHH:00" form. Also the primary key. */
  hour: string;
  /**
   * Always stored in metric (Celsius, hPa, km/h) no matter what the user has
   * chosen to see. Unit preference is a display concern only, so toggling it
   * can never reinterpret years of history as the wrong scale.
   */
  temperature?: number;
  apparentTemperature?: number;
  /** Sea-level barometric pressure, hPa. */
  pressure?: number;
  humidity?: number;
  precipitation?: number;
  cloudCover?: number;
  windSpeed?: number;
  windGusts?: number;
  uvIndex?: number;
  weatherCode?: number;
  /** US AQI, 0-500. */
  aqi?: number;
  pm25?: number;
  pm10?: number;
  ozone?: number;
  /** Grains/m3. Often unavailable outside Europe; see lib/weather.ts. */
  grassPollen?: number;
  treePollen?: number;
  weedPollen?: number;
  /** Latitude/longitude the reading was pulled for, to spot moves. */
  lat?: number;
  lon?: number;
};

export type SavedLocation = {
  name: string;
  lat: number;
  lon: number;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timezone: string;
};

export type Units = {
  temperature: "fahrenheit" | "celsius";
  /** inHg is what US weather reports and most US migraine advice use. */
  pressure: "hPa" | "inHg";
  wind: "mph" | "kmh";
};

export type Settings = {
  location: SavedLocation | null;
  units: Units;
  trackers: Tracker[];
  /** Softens contrast and brightness for light sensitivity during an attack. */
  comfortMode: boolean;
  /** Name shown on the printable doctor report. */
  patientName: string;
  /** ISO timestamp of the last successful environmental sync. */
  lastSyncAt: string | null;
};
