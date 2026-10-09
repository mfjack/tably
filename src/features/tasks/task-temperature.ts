import type { TemperatureRange } from "./types";

export function formatTemperature(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`;
}

export function describeTemperatureRange({
  minTemperature,
  maxTemperature,
}: TemperatureRange): string {
  if (minTemperature !== null && maxTemperature !== null) {
    return `${minTemperature.toLocaleString("pt-BR")} a ${formatTemperature(maxTemperature)}`;
  }
  if (maxTemperature !== null)
    return `até ${formatTemperature(maxTemperature)}`;
  if (minTemperature !== null) {
    return `${formatTemperature(minTemperature)} ou mais`;
  }
  return "";
}

export function isTemperatureOutOfRange(
  temperature: number,
  { minTemperature, maxTemperature }: TemperatureRange,
): boolean {
  return (
    (minTemperature !== null && temperature < minTemperature) ||
    (maxTemperature !== null && temperature > maxTemperature)
  );
}
