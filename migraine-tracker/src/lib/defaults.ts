import type { Settings, Tracker } from "./types";
import { DEFAULT_UNITS } from "./units";

/**
 * The starting set of things to track. Everything migraine-specific that a
 * neurologist typically asks about is here; the ones most people rate every
 * time are on by default and the rest can be switched on in Settings, so the
 * logging screen stays short enough to finish during an actual attack.
 */
export const DEFAULT_TRACKERS: Tracker[] = [
  {
    id: "migraine",
    label: "Overall migraine",
    hint: "How bad is the migraine as a whole right now?",
    enabled: true,
    builtIn: true,
  },
  {
    id: "headPain",
    label: "Head pain",
    hint: "Just the pain itself, ignoring other symptoms",
    enabled: true,
    builtIn: true,
  },
  {
    id: "dizziness",
    label: "Dizziness",
    hint: "Lightheaded, unsteady, or faint",
    enabled: true,
    builtIn: true,
  },
  {
    id: "vertigo",
    label: "Vertigo",
    hint: "The room spinning or tilting",
    enabled: true,
    builtIn: true,
  },
  {
    id: "nausea",
    label: "Nausea",
    hint: "Queasy stomach or vomiting",
    enabled: true,
    builtIn: true,
  },
  {
    id: "lightSensitivity",
    label: "Light sensitivity",
    hint: "Light feels painful or makes symptoms worse",
    enabled: true,
    builtIn: true,
  },
  {
    id: "soundSensitivity",
    label: "Sound sensitivity",
    hint: "Noise feels painful or makes symptoms worse",
    enabled: false,
    builtIn: true,
  },
  {
    id: "aura",
    label: "Aura",
    hint: "Visual changes, tingling, or speech trouble",
    enabled: false,
    builtIn: true,
  },
  {
    id: "neckTension",
    label: "Neck & shoulder tension",
    hint: "Tightness or pain in the neck and shoulders",
    enabled: false,
    builtIn: true,
  },
  {
    id: "brainFog",
    label: "Brain fog",
    hint: "Trouble thinking, focusing, or finding words",
    enabled: false,
    builtIn: true,
  },
  {
    id: "fatigue",
    label: "Fatigue",
    hint: "Exhaustion beyond ordinary tiredness",
    enabled: false,
    builtIn: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  location: null,
  units: DEFAULT_UNITS,
  trackers: DEFAULT_TRACKERS,
  comfortMode: false,
  patientName: "",
  lastSyncAt: null,
};

/**
 * Merges saved settings over the defaults so an app update that adds a new
 * built-in tracker does not silently drop it from an existing install.
 */
export function withDefaults(saved: Settings | null): Settings {
  if (!saved) return { ...DEFAULT_SETTINGS };

  const savedById = new Map((saved.trackers ?? []).map((t) => [t.id, t]));
  const merged = DEFAULT_TRACKERS.map((t) => savedById.get(t.id) ?? t);
  const custom = (saved.trackers ?? []).filter((t) => !t.builtIn);

  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    units: { ...DEFAULT_UNITS, ...(saved.units ?? {}) },
    trackers: [...merged, ...custom],
  };
}

export function newId(): string {
  // crypto.randomUUID is available in every browser this app targets, but the
  // fallback keeps server-side prerendering of the static export from crashing.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
