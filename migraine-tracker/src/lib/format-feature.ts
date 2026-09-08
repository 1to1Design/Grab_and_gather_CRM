import type { EnvFeature } from "./analysis";
import type { Units } from "./types";
import {
  formatPressure,
  formatPressureDelta,
  formatTemperature,
  formatTemperatureDelta,
  formatWind,
} from "./units";

/** Renders a stored (metric) feature value in the user's chosen units. */
export function formatFeatureValue(
  feature: EnvFeature,
  value: number,
  units: Units,
): string {
  switch (feature.convert) {
    case "temperature":
      return formatTemperature(value, units);
    case "temperatureDelta":
      return formatTemperatureDelta(value, units);
    case "pressure":
      return feature.id === "pressure"
        ? formatPressure(value, units)
        : `${value >= 0 ? "+" : "−"}${formatPressureDelta(Math.abs(value), units)}`;
    case "wind":
      return formatWind(value, units);
    default: {
      const rounded = Math.abs(value) >= 10 ? Math.round(value) : Number(value.toFixed(1));
      return feature.unit ? `${rounded} ${feature.unit}` : String(rounded);
    }
  }
}
