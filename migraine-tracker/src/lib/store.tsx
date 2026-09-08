"use client";

/**
 * One provider holds everything the app knows, loaded from IndexedDB on mount.
 * The data set is small enough (a few thousand rows even after years) that
 * keeping it all in memory is simpler and faster than querying per screen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as db from "./db";
import { DEFAULT_SETTINGS, newId, withDefaults } from "./defaults";
import { buildEnvIndex, hourKey, type EnvIndex } from "./analysis";
import { fetchEnvironment, MAX_PAST_DAYS } from "./weather";
import type {
  DoseEvent,
  EnvReading,
  Medication,
  Settings,
  SymptomEntry,
} from "./types";

type SyncState = "idle" | "syncing" | "error";

type Store = {
  ready: boolean;
  settings: Settings;
  entries: SymptomEntry[];
  env: EnvReading[];
  envIndex: EnvIndex;
  meds: Medication[];
  doses: DoseEvent[];
  syncState: SyncState;
  syncError: string | null;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  addEntry: (entry: Omit<SymptomEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (entry: SymptomEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  upsertMed: (med: Medication) => Promise<void>;
  removeMed: (id: string) => Promise<void>;
  recordDose: (dose: Omit<DoseEvent, "id">) => Promise<void>;
  removeDose: (id: string) => Promise<void>;
  syncEnvironment: (force?: boolean) => Promise<void>;
  reloadAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

/** Environmental data is only refreshed this often; it is hourly at source. */
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [env, setEnv] = useState<EnvReading[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseEvent[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  // Held in a ref so the sync callback can read current settings without
  // being recreated on every settings change and re-triggering itself.
  const settingsRef = useRef(settings);
  const syncingRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const reloadAll = useCallback(async () => {
    const [savedSettings, savedEntries, savedEnv, savedMeds, savedDoses] =
      await Promise.all([
        db.loadSettings(),
        db.loadEntries(),
        db.loadEnv(),
        db.loadMeds(),
        db.loadDoses(),
      ]);
    setSettings(withDefaults(savedSettings));
    setEntries(savedEntries.sort((a, b) => b.at.localeCompare(a.at)));
    setEnv(savedEnv);
    setMeds(savedMeds);
    setDoses(savedDoses.sort((a, b) => b.at.localeCompare(a.at)));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await reloadAll();
      } catch {
        // A browser with IndexedDB blocked still gets a usable, if forgetful,
        // app rather than a blank screen.
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [reloadAll]);

  const syncEnvironment = useCallback(
    async (force = false) => {
      const current = settingsRef.current;
      if (!current.location || syncingRef.current) return;

      const last = current.lastSyncAt ? new Date(current.lastSyncAt) : null;
      const sinceLast = last ? Date.now() - last.getTime() : Infinity;
      if (!force && sinceLast < SYNC_INTERVAL_MS) return;

      syncingRef.current = true;
      setSyncState("syncing");
      setSyncError(null);
      try {
        // Backfill every hour missed since the last sync, so closing the app
        // for a month still produces a complete hourly record.
        const missedDays = last
          ? Math.ceil(sinceLast / (24 * 60 * 60 * 1000)) + 1
          : 30;
        const readings = await fetchEnvironment(
          current.location,
          Math.min(Math.max(missedDays, 2), MAX_PAST_DAYS),
        );
        await db.saveEnvReadings(readings);

        // Merged functionally so this callback never depends on `env` and can
        // stay referentially stable across syncs.
        setEnv((previous) => {
          const merged = new Map(previous.map((r) => [r.hour, r]));
          for (const reading of readings) merged.set(reading.hour, reading);
          return [...merged.values()];
        });

        const next = { ...current, lastSyncAt: new Date().toISOString() };
        settingsRef.current = next;
        setSettings(next);
        await db.saveSettings(next);
        setSyncState("idle");
      } catch (error) {
        setSyncState("error");
        setSyncError(
          error instanceof Error ? error.message : "Could not reach the weather service.",
        );
      } finally {
        syncingRef.current = false;
      }
    },
    [],
  );

  // Sync on load, when the tab comes back to the foreground, and hourly while
  // the app is left open on a bedside table.
  useEffect(() => {
    if (!ready) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void syncEnvironment();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void syncEnvironment(), SYNC_INTERVAL_MS);
    // Deferred by a tick so the first sync is a reaction to mount finishing
    // rather than a state update inside the effect body itself.
    const initial = window.setTimeout(() => void syncEnvironment(), 0);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      window.clearTimeout(initial);
    };
  }, [ready, syncEnvironment]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await db.saveSettings(next);
  }, []);

  const addEntry = useCallback(
    async (entry: Omit<SymptomEntry, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const full: SymptomEntry = { ...entry, id: newId(), createdAt: now, updatedAt: now };
      await db.saveEntry(full);
      setEntries((prev) => [full, ...prev].sort((a, b) => b.at.localeCompare(a.at)));
    },
    [],
  );

  const updateEntry = useCallback(async (entry: SymptomEntry) => {
    const full = { ...entry, updatedAt: new Date().toISOString() };
    await db.saveEntry(full);
    setEntries((prev) =>
      prev.map((e) => (e.id === full.id ? full : e)).sort((a, b) => b.at.localeCompare(a.at)),
    );
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await db.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const upsertMed = useCallback(async (med: Medication) => {
    await db.saveMed(med);
    setMeds((prev) => {
      const exists = prev.some((m) => m.id === med.id);
      return exists ? prev.map((m) => (m.id === med.id ? med : m)) : [...prev, med];
    });
  }, []);

  const removeMed = useCallback(async (id: string) => {
    await db.deleteMed(id);
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const recordDose = useCallback(async (dose: Omit<DoseEvent, "id">) => {
    const full: DoseEvent = { ...dose, id: newId() };
    await db.saveDose(full);
    setDoses((prev) => [full, ...prev].sort((a, b) => b.at.localeCompare(a.at)));
  }, []);

  const removeDose = useCallback(async (id: string) => {
    await db.deleteDose(id);
    setDoses((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const envIndex = useMemo(() => buildEnvIndex(env), [env]);

  const value: Store = {
    ready,
    settings,
    entries,
    env,
    envIndex,
    meds,
    doses,
    syncState,
    syncError,
    updateSettings,
    addEntry,
    updateEntry,
    removeEntry,
    upsertMed,
    removeMed,
    recordDose,
    removeDose,
    syncEnvironment,
    reloadAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

/** The environmental reading for the current hour, if it has been synced. */
export function useCurrentReading(): EnvReading | undefined {
  const { envIndex } = useStore();
  return envIndex.get(hourKey(new Date()));
}
