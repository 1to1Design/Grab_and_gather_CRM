/**
 * A thin promise wrapper over IndexedDB.
 *
 * IndexedDB rather than localStorage because the environmental history alone
 * is 24 rows a day; a couple of years of tracking would overflow the ~5 MB
 * localStorage budget, and losing a migraine diary to a silent quota error is
 * exactly the failure this app cannot have.
 */

import type {
  DoseEvent,
  EnvReading,
  Medication,
  Settings,
  SymptomEntry,
} from "./types";

const DB_NAME = "migraine-tracker";
const DB_VERSION = 1;

export const STORES = {
  entries: "entries",
  env: "env",
  meds: "meds",
  doses: "doses",
  settings: "settings",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.entries)) {
        const entries = db.createObjectStore(STORES.entries, { keyPath: "id" });
        entries.createIndex("at", "at");
      }
      if (!db.objectStoreNames.contains(STORES.env)) {
        // Keyed by hour so re-syncing the same window overwrites in place.
        db.createObjectStore(STORES.env, { keyPath: "hour" });
      }
      if (!db.objectStoreNames.contains(STORES.meds)) {
        db.createObjectStore(STORES.meds, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.doses)) {
        const doses = db.createObjectStore(STORES.doses, { keyPath: "id" });
        doses.createIndex("at", "at");
        doses.createIndex("medId", "medId");
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = fn(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function put<T>(store: StoreName, value: T): Promise<void> {
  return run(store, "readwrite", (s) => s.put(value)).then(() => undefined);
}

export function remove(store: StoreName, key: IDBValidKey): Promise<void> {
  return run(store, "readwrite", (s) => s.delete(key)).then(() => undefined);
}

export function clearStore(store: StoreName): Promise<void> {
  return run(store, "readwrite", (s) => s.clear()).then(() => undefined);
}

/** Writes many records in one transaction so a partial sync cannot half-apply. */
export function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return Promise.resolve();
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const objectStore = tx.objectStore(store);
        for (const value of values) objectStore.put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/* ---------- typed helpers ---------- */

export const loadEntries = () => getAll<SymptomEntry>(STORES.entries);
export const saveEntry = (entry: SymptomEntry) => put(STORES.entries, entry);
export const deleteEntry = (id: string) => remove(STORES.entries, id);

export const loadEnv = () => getAll<EnvReading>(STORES.env);
export const saveEnvReadings = (readings: EnvReading[]) =>
  putMany(STORES.env, readings);

export const loadMeds = () => getAll<Medication>(STORES.meds);
export const saveMed = (med: Medication) => put(STORES.meds, med);
export const deleteMed = (id: string) => remove(STORES.meds, id);

export const loadDoses = () => getAll<DoseEvent>(STORES.doses);
export const saveDose = (dose: DoseEvent) => put(STORES.doses, dose);
export const deleteDose = (id: string) => remove(STORES.doses, id);

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<Settings | null> {
  type Row = { key: string; value: Settings } | undefined;
  const row = await run<Row>(STORES.settings, "readonly", (s) =>
    s.get(SETTINGS_KEY) as IDBRequest<Row>,
  );
  return row?.value ?? null;
}

export function saveSettings(value: Settings): Promise<void> {
  return put(STORES.settings, { key: SETTINGS_KEY, value });
}

/** Everything the user has ever entered, for backup and for moving devices. */
export async function exportAll() {
  const [entries, env, meds, doses, settings] = await Promise.all([
    loadEntries(),
    loadEnv(),
    loadMeds(),
    loadDoses(),
    loadSettings(),
  ]);
  return {
    format: "migraine-tracker-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    env,
    meds,
    doses,
    settings,
  };
}

type Backup = Awaited<ReturnType<typeof exportAll>>;

/**
 * Restores a backup. Records are merged by key, so importing a newer backup
 * over an existing device keeps anything the backup does not mention rather
 * than wiping it.
 */
export async function importAll(backup: Backup) {
  if (backup?.format !== "migraine-tracker-backup") {
    throw new Error("That file is not a migraine tracker backup.");
  }
  await putMany(STORES.entries, backup.entries ?? []);
  await putMany(STORES.env, backup.env ?? []);
  await putMany(STORES.meds, backup.meds ?? []);
  await putMany(STORES.doses, backup.doses ?? []);
  if (backup.settings) await saveSettings(backup.settings);
}

/** Used by the "delete everything" button in Settings. */
export async function wipeAll() {
  await Promise.all([
    clearStore(STORES.entries),
    clearStore(STORES.env),
    clearStore(STORES.meds),
    clearStore(STORES.doses),
    clearStore(STORES.settings),
  ]);
}
