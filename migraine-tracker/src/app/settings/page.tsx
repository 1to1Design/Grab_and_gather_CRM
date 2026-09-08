"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Button,
  Card,
  Field,
  PageTitle,
  SectionTitle,
  Select,
  TextInput,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { locationFromCoords, searchLocations, type GeocodeResult } from "@/lib/weather";
import { exportAll, importAll, wipeAll } from "@/lib/db";
import { dosesToCsv, downloadText, entriesToCsv } from "@/lib/export";
import { newId } from "@/lib/defaults";
import type { Tracker } from "@/lib/types";

export default function SettingsPage() {
  const {
    ready,
    settings,
    entries,
    doses,
    meds,
    envIndex,
    updateSettings,
    syncEnvironment,
    reloadAll,
  } = useStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [newTracker, setNewTracker] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function detectLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This browser cannot share a location. Search for a place instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = await locationFromCoords(
          position.coords.latitude,
          position.coords.longitude,
        );
        await updateSettings({ location, lastSyncAt: null });
        void syncEnvironment(true);
      },
      () => setLocationError("Location permission was declined. Search for a place instead."),
      { timeout: 10000 },
    );
  }

  async function runSearch() {
    setSearching(true);
    setLocationError(null);
    try {
      setResults(await searchLocations(query));
    } catch {
      setLocationError("Could not reach the location search. Check your connection.");
    } finally {
      setSearching(false);
    }
  }

  function toggleTracker(id: string, enabled: boolean) {
    void updateSettings({
      trackers: settings.trackers.map((t) => (t.id === id ? { ...t, enabled } : t)),
    });
  }

  function addTracker() {
    const label = newTracker.trim();
    if (!label) return;
    const tracker: Tracker = {
      id: newId(),
      label,
      hint: "Your own tracker",
      enabled: true,
      builtIn: false,
    };
    void updateSettings({ trackers: [...settings.trackers, tracker] });
    setNewTracker("");
  }

  async function handleImport(file: File) {
    try {
      const backup = JSON.parse(await file.text());
      await importAll(backup);
      await reloadAll();
      setImportMessage("Backup restored.");
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "That file could not be read.",
      );
    }
  }

  if (!ready) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <PageTitle>Settings</PageTitle>

      <Card>
        <SectionTitle>Location</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Used to pull hourly temperature, barometric pressure, humidity, and air
          quality. Coordinates go to Open-Meteo; nothing about your health ever
          leaves this device.
        </p>
        {settings.location ? (
          <p className="mb-3 rounded-xl border border-line bg-surface-2 p-3">
            Currently <strong>{settings.location.name}</strong>{" "}
            <span className="text-muted">
              ({settings.location.lat.toFixed(2)}, {settings.location.lon.toFixed(2)})
            </span>
          </p>
        ) : null}

        <Button variant="primary" size="lg" onClick={() => void detectLocation()}>
          Use my current location
        </Button>

        <div className="mt-3 flex gap-2">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder="Or search for a town or city"
          />
          <Button onClick={() => void runSearch()} disabled={searching}>
            {searching ? "…" : "Search"}
          </Button>
        </div>

        {locationError ? (
          <p className="mt-2 text-sm text-[#e59b95]">{locationError}</p>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {results.map((result) => (
              <li key={`${result.lat},${result.lon}`}>
                <Button
                  size="lg"
                  onClick={async () => {
                    await updateSettings({
                      location: {
                        name: result.name,
                        lat: result.lat,
                        lon: result.lon,
                        timezone: result.timezone,
                      },
                      lastSyncAt: null,
                    });
                    setResults([]);
                    setQuery("");
                    void syncEnvironment(true);
                  }}
                >
                  {result.name}
                  {result.admin1 ? `, ${result.admin1}` : ""}
                  {result.country ? `, ${result.country}` : ""}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Display</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Temperature">
            <Select
              value={settings.units.temperature}
              onChange={(e) =>
                void updateSettings({
                  units: {
                    ...settings.units,
                    temperature: e.target.value as "fahrenheit" | "celsius",
                  },
                })
              }
            >
              <option value="fahrenheit">Fahrenheit</option>
              <option value="celsius">Celsius</option>
            </Select>
          </Field>
          <Field label="Pressure">
            <Select
              value={settings.units.pressure}
              onChange={(e) =>
                void updateSettings({
                  units: { ...settings.units, pressure: e.target.value as "hPa" | "inHg" },
                })
              }
            >
              <option value="inHg">inHg</option>
              <option value="hPa">hPa (millibars)</option>
            </Select>
          </Field>
          <Field label="Wind">
            <Select
              value={settings.units.wind}
              onChange={(e) =>
                void updateSettings({
                  units: { ...settings.units, wind: e.target.value as "mph" | "kmh" },
                })
              }
            >
              <option value="mph">mph</option>
              <option value="kmh">km/h</option>
            </Select>
          </Field>
          <Field label="Name on the report">
            <TextInput
              value={settings.patientName}
              onChange={(e) => void updateSettings({ patientName: e.target.value })}
              placeholder="Optional"
            />
          </Field>
        </div>

        <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-3">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--accent)]"
            checked={settings.comfortMode}
            onChange={(e) => void updateSettings({ comfortMode: e.target.checked })}
          />
          <span>
            <span className="font-medium">Comfort mode</span>
            <span className="block text-sm text-muted">
              Dims the whole screen for light sensitivity during an attack.
            </span>
          </span>
        </label>
      </Card>

      <Card>
        <SectionTitle>What to track</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Fewer trackers means a faster entry mid-attack. Everything switched off
          keeps its history.
        </p>
        <ul className="space-y-2">
          {settings.trackers.map((tracker) => (
            <li key={tracker.id}>
              <label className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-3">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-[var(--accent)]"
                  checked={tracker.enabled}
                  onChange={(e) => toggleTracker(tracker.id, e.target.checked)}
                />
                <span className="flex-1">
                  <span className="font-medium">{tracker.label}</span>
                  <span className="block text-sm text-muted">{tracker.hint}</span>
                </span>
                {!tracker.builtIn ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void updateSettings({
                        trackers: settings.trackers.filter((t) => t.id !== tracker.id),
                      })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <TextInput
            value={newTracker}
            onChange={(e) => setNewTracker(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTracker();
            }}
            placeholder="Add your own, e.g. Jaw pain"
          />
          <Button onClick={addTracker} disabled={!newTracker.trim()}>
            Add
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Your data</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Everything is stored on this device only. There is no account and no
          server, so a backup is the only way to move to a new phone — or to
          recover if this browser&apos;s data is cleared.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={async () => {
              const backup = await exportAll();
              downloadText(
                `migraine-backup-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(backup, null, 2),
                "application/json",
              );
            }}
          >
            Download full backup
          </Button>
          <Button onClick={() => fileInput.current?.click()}>Restore from backup</Button>
          <Button
            onClick={() =>
              downloadText(
                `migraine-entries-${new Date().toISOString().slice(0, 10)}.csv`,
                entriesToCsv(entries, settings.trackers, envIndex),
              )
            }
          >
            Export entries as CSV
          </Button>
          <Button
            onClick={() =>
              downloadText(
                `migraine-doses-${new Date().toISOString().slice(0, 10)}.csv`,
                dosesToCsv(doses, meds),
              )
            }
          >
            Export doses as CSV
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = "";
          }}
        />
        {importMessage ? <p className="mt-2 text-sm text-accent">{importMessage}</p> : null}

        <Link href="/report" className="mt-3 block">
          <Button size="lg">Open the doctor report</Button>
        </Link>

        <div className="mt-4 border-t border-line pt-4">
          <Button
            variant="danger"
            onClick={async () => {
              if (
                window.confirm(
                  "Delete every entry, medication, and dose on this device? This cannot be undone. Download a backup first if you might want the data back.",
                )
              ) {
                await wipeAll();
                await reloadAll();
              }
            }}
          >
            Delete all data
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>About</SectionTitle>
        <p className="text-sm text-muted">
          Weather, barometric pressure, and air quality come from{" "}
          <a
            className="underline underline-offset-4"
            href="https://open-meteo.com"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo
          </a>
          , which is free for non-commercial use and needs no account. Symptom
          data never leaves this device.
        </p>
        <p className="mt-2 text-sm text-muted">
          This app records and summarises what you enter. It does not diagnose
          anything and is not a substitute for medical advice.
        </p>
      </Card>
    </div>
  );
}
