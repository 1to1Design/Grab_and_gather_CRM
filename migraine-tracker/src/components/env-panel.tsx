"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { currentConditions, hourKey, shiftHours } from "@/lib/analysis";
import { describeWeather } from "@/lib/weather";
import {
  aqiCategory,
  formatPercent,
  formatPressure,
  formatPressureDelta,
  formatTemperature,
  formatWind,
} from "@/lib/units";
import { Button, Card, Stat } from "./ui";
import { Sparkline } from "./sparkline";

/**
 * The environmental snapshot that sits at the top of the app: what the air is
 * doing right now, what it has been doing, and which of those readings are far
 * enough from ordinary to be worth writing down.
 */
export function EnvPanel() {
  const { settings, envIndex, syncState, syncError, syncEnvironment } = useStore();
  const units = settings.units;

  const now = hourKey(new Date());
  const reading = envIndex.get(now);

  // 24 hours of pressure, oldest first, for the trend line.
  const pressureSeries = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const hour = shiftHours(now, 24 - i);
      const value = envIndex.get(hour)?.pressure;
      return typeof value === "number" ? value : null;
    });
  }, [envIndex, now]);

  const change24h = useMemo(() => {
    const then = envIndex.get(shiftHours(now, 24))?.pressure;
    return reading?.pressure !== undefined && then !== undefined
      ? reading.pressure - then
      : undefined;
  }, [envIndex, now, reading]);

  const conditions = useMemo(
    () => currentConditions(envIndex, now, (hPa) => formatPressureDelta(hPa, units)),
    [envIndex, now, units],
  );

  const hasPollen =
    reading?.grassPollen !== undefined ||
    reading?.treePollen !== undefined ||
    reading?.weedPollen !== undefined;

  if (!settings.location) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Add your location</h2>
        <p className="mt-1 text-muted">
          Once the app knows where you are, it pulls local temperature, barometric
          pressure, humidity, and air quality every hour — and keeps that history
          alongside your symptoms.
        </p>
        <Link href="/settings" className="mt-4 block">
          <Button variant="primary" size="lg">
            Set location
          </Button>
        </Link>
      </Card>
    );
  }

  if (!reading) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {syncState === "syncing" ? "Getting conditions…" : "No conditions yet"}
            </h2>
            <p className="text-sm text-muted">
              {syncError ?? `Pulling hourly data for ${settings.location.name}.`}
            </p>
          </div>
          <Button onClick={() => void syncEnvironment(true)}>Retry</Button>
        </div>
      </Card>
    );
  }

  const rising = (change24h ?? 0) > 0;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {settings.location.name}
          </h2>
          <p className="text-sm text-muted">
            {describeWeather(reading.weatherCode)} ·{" "}
            {settings.lastSyncAt
              ? `updated ${new Date(settings.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "not synced yet"}
          </p>
        </div>
        <Button
          onClick={() => void syncEnvironment(true)}
          disabled={syncState === "syncing"}
          className="no-print"
        >
          {syncState === "syncing" ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Pressure"
          value={formatPressure(reading.pressure, units)}
          detail={
            change24h === undefined
              ? "24h change unknown"
              : `${rising ? "▲" : "▼"} ${formatPressureDelta(Math.abs(change24h), units)} in 24h`
          }
          emphasis={change24h !== undefined && Math.abs(change24h) >= 5}
        />
        <Stat
          label="Temperature"
          value={formatTemperature(reading.temperature, units)}
          detail={`feels ${formatTemperature(reading.apparentTemperature, units)}`}
        />
        <Stat label="Humidity" value={formatPercent(reading.humidity)} />
        <Stat
          label="Air quality"
          value={reading.aqi === undefined ? "—" : Math.round(reading.aqi)}
          detail={aqiCategory(reading.aqi)}
          emphasis={(reading.aqi ?? 0) > 100}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted">
          <span>Barometric pressure, past 24 hours</span>
          <span className="tabular-nums">
            {change24h === undefined
              ? ""
              : `${rising ? "+" : "−"}${formatPressureDelta(Math.abs(change24h), units)}`}
          </span>
        </div>
        <Sparkline points={pressureSeries} label="Barometric pressure over the past 24 hours" />
      </div>

      <details className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <summary className="cursor-pointer text-sm font-medium text-muted">
          More conditions
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Wind gusts" value={formatWind(reading.windGusts, units)} />
          <Stat
            label="UV index"
            value={reading.uvIndex === undefined ? "—" : Math.round(reading.uvIndex)}
          />
          <Stat label="Cloud cover" value={formatPercent(reading.cloudCover)} />
          <Stat
            label="PM2.5"
            value={reading.pm25 === undefined ? "—" : `${Math.round(reading.pm25)}`}
            detail="µg/m³"
          />
          {hasPollen ? (
            <>
              <Stat
                label="Tree pollen"
                value={reading.treePollen === undefined ? "—" : Math.round(reading.treePollen)}
              />
              <Stat
                label="Grass pollen"
                value={reading.grassPollen === undefined ? "—" : Math.round(reading.grassPollen)}
              />
              <Stat
                label="Weed pollen"
                value={reading.weedPollen === undefined ? "—" : Math.round(reading.weedPollen)}
              />
            </>
          ) : null}
        </div>
        {!hasPollen ? (
          <p className="mt-2 text-xs text-muted">
            Pollen counts come from a European forecast model and are not published
            for this location.
          </p>
        ) : null}
      </details>

      {conditions.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-sm font-medium text-muted">Worth noting right now</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {conditions.map((condition) => (
              <li
                key={condition.id}
                className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm"
              >
                <span className="text-muted">{condition.label}:</span>{" "}
                <strong className="font-semibold">{condition.detail}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            These are simply unusual readings, not predictions. Whether they matter
            for you shows up on the Patterns screen once you have logged enough days.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
