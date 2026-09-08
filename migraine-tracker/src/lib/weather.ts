/**
 * Environmental data comes from Open-Meteo (https://open-meteo.com), which is
 * free for non-commercial use and needs no API key or account. That matters
 * here: it means anyone can run this app without signing up for anything.
 *
 * The app does not need a server cron job to get hourly readings. Open-Meteo
 * serves up to 92 days of *past* hourly data from the same endpoint as the
 * forecast, so opening the app backfills every hour that was missed while it
 * was closed. Closing the app for a week loses nothing.
 */

import type { EnvReading, SavedLocation } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** Open-Meteo's ceiling for `past_days` on both endpoints. */
export const MAX_PAST_DAYS = 92;

const WEATHER_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "pressure_msl",
  "precipitation",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "uv_index",
  "weather_code",
] as const;

const AIR_FIELDS = [
  "pm10",
  "pm2_5",
  "ozone",
  "us_aqi",
  // Pollen comes from the CAMS European model and is null outside Europe.
  // The UI hides these tiles when every value in the window is null rather
  // than showing a row of dashes to users who can never populate it.
  "alder_pollen",
  "birch_pollen",
  "olive_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "ragweed_pollen",
] as const;

type HourlyBlock = Record<string, Array<number | null>> & { time?: string[] };

async function fetchJson(url: string): Promise<{ hourly?: HourlyBlock }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status}`);
  }
  return response.json();
}

/** Highest of several possibly-missing values, or undefined if all are missing. */
function maxOf(values: Array<number | null | undefined>): number | undefined {
  const present = values.filter((v): v is number => typeof v === "number");
  return present.length ? Math.max(...present) : undefined;
}

function value(block: HourlyBlock | undefined, key: string, i: number) {
  const v = block?.[key]?.[i];
  return typeof v === "number" ? v : undefined;
}

/**
 * Pulls `pastDays` of history plus the current day's forecast and returns one
 * record per hour. Readings are always metric; display units are applied later.
 */
export async function fetchEnvironment(
  location: SavedLocation,
  pastDays = 2,
): Promise<EnvReading[]> {
  const days = Math.min(Math.max(Math.ceil(pastDays), 1), MAX_PAST_DAYS);
  const common =
    `latitude=${location.lat}&longitude=${location.lon}` +
    `&timezone=${encodeURIComponent(location.timezone || "auto")}` +
    `&past_days=${days}&forecast_days=1`;

  // Air quality is requested alongside weather but is allowed to fail on its
  // own: a pollution outage should never cost the user their pressure history.
  const [weather, air] = await Promise.all([
    fetchJson(`${FORECAST_URL}?${common}&hourly=${WEATHER_FIELDS.join(",")}`),
    fetchJson(`${AIR_QUALITY_URL}?${common}&hourly=${AIR_FIELDS.join(",")}`).catch(
      () => ({ hourly: undefined }),
    ),
  ]);

  const times = weather.hourly?.time ?? [];
  const airTimes = air.hourly?.time ?? [];
  const airIndexByTime = new Map(airTimes.map((t, i) => [t, i]));

  return times.map((time, i) => {
    const a = airIndexByTime.get(time);
    const air_ = a === undefined ? undefined : air.hourly;
    const airAt = (key: string) =>
      a === undefined ? undefined : value(air_, key, a);

    const reading: EnvReading = {
      hour: time,
      temperature: value(weather.hourly, "temperature_2m", i),
      apparentTemperature: value(weather.hourly, "apparent_temperature", i),
      humidity: value(weather.hourly, "relative_humidity_2m", i),
      pressure: value(weather.hourly, "pressure_msl", i),
      precipitation: value(weather.hourly, "precipitation", i),
      cloudCover: value(weather.hourly, "cloud_cover", i),
      windSpeed: value(weather.hourly, "wind_speed_10m", i),
      windGusts: value(weather.hourly, "wind_gusts_10m", i),
      uvIndex: value(weather.hourly, "uv_index", i),
      weatherCode: value(weather.hourly, "weather_code", i),
      aqi: airAt("us_aqi"),
      pm25: airAt("pm2_5"),
      pm10: airAt("pm10"),
      ozone: airAt("ozone"),
      treePollen: maxOf([
        airAt("alder_pollen"),
        airAt("birch_pollen"),
        airAt("olive_pollen"),
      ]),
      grassPollen: airAt("grass_pollen"),
      weedPollen: maxOf([airAt("mugwort_pollen"), airAt("ragweed_pollen")]),
      lat: location.lat,
      lon: location.lon,
    };

    // Drop undefined keys so IndexedDB rows stay small over years of hours.
    for (const key of Object.keys(reading) as Array<keyof EnvReading>) {
      if (reading[key] === undefined) delete reading[key];
    }
    return reading;
  });
}

export type GeocodeResult = SavedLocation & { admin1?: string; country?: string };

/** Free-text place search, so a user without GPS can still set a location. */
export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 2) return [];
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not search for that place.");
  const data: {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      timezone: string;
      admin1?: string;
      country?: string;
    }>;
  } = await response.json();

  return (data.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
    admin1: r.admin1,
    country: r.country,
  }));
}

/** Reverse-geocodes browser GPS coordinates into a named, timezone-aware location. */
export async function locationFromCoords(
  lat: number,
  lon: number,
): Promise<SavedLocation> {
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "auto";
  const rounded = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  try {
    // Open-Meteo has no reverse geocoder, so the nearest named place from a
    // forward search on the coordinates is close enough for a display label.
    const response = await fetch(
      `${GEOCODING_URL}?latitude=${lat}&longitude=${lon}&count=1&format=json`,
    );
    if (response.ok) {
      const data: { results?: Array<{ name: string }> } = await response.json();
      const name = data.results?.[0]?.name;
      if (name) return { name, lat, lon, timezone };
    }
  } catch {
    // Falls through to coordinates, which work identically for data pulls.
  }
  return { name: rounded, lat, lon, timezone };
}

/** Plain-language label for an Open-Meteo WMO weather code. */
export function describeWeather(code: number | undefined): string {
  if (code === undefined) return "—";
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}
