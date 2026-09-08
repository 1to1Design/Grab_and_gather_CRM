/**
 * Readings are stored metric and converted here for display, so changing a
 * unit preference never rewrites stored history.
 */

import type { Units } from "./types";

export const DEFAULT_UNITS: Units = {
  temperature: "fahrenheit",
  pressure: "inHg",
  wind: "mph",
};

const HPA_TO_INHG = 0.02952998057228486;
const KMH_TO_MPH = 0.621371;

export function formatTemperature(celsius: number | undefined, units: Units) {
  if (celsius === undefined) return "—";
  const value =
    units.temperature === "fahrenheit" ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(value)}°`;
}

/** A temperature *difference* scales without the freezing-point offset. */
export function formatTemperatureDelta(celsius: number | undefined, units: Units) {
  if (celsius === undefined) return "—";
  const value = units.temperature === "fahrenheit" ? celsius * 1.8 : celsius;
  return `${value > 0 ? "+" : ""}${Math.round(value)}°`;
}

export function formatPressure(hPa: number | undefined, units: Units) {
  if (hPa === undefined) return "—";
  return units.pressure === "inHg"
    ? `${(hPa * HPA_TO_INHG).toFixed(2)} inHg`
    : `${Math.round(hPa)} hPa`;
}

/** Pressure *changes* are small, so inHg needs an extra decimal to be readable. */
export function formatPressureDelta(hPa: number | undefined, units: Units) {
  if (hPa === undefined) return "—";
  return units.pressure === "inHg"
    ? `${(hPa * HPA_TO_INHG).toFixed(2)} inHg`
    : `${hPa.toFixed(1)} hPa`;
}

export function formatWind(kmh: number | undefined, units: Units) {
  if (kmh === undefined) return "—";
  return units.wind === "mph"
    ? `${Math.round(kmh * KMH_TO_MPH)} mph`
    : `${Math.round(kmh)} km/h`;
}

export function formatPercent(value: number | undefined) {
  return value === undefined ? "—" : `${Math.round(value)}%`;
}

/** EPA air-quality category names for a US AQI value. */
export function aqiCategory(aqi: number | undefined): string {
  if (aqi === undefined) return "—";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}
