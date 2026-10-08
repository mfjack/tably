import { Constants, type Database } from "@/lib/supabase/database.types";

export type StorageCondition = Database["public"]["Enums"]["storage_condition"];

export const STORAGE_CONDITIONS = Constants.public.Enums.storage_condition;

export const STORAGE_CONDITION_LABELS = {
  room_temperature: "Ambiente",
  refrigerated: "Refrigerado",
  frozen: "Congelado",
} as const satisfies Record<StorageCondition, string>;

export const STORAGE_CONDITION_DETAILS = {
  room_temperature: "Temperatura ambiente",
  refrigerated: "Refrigerado até 5 °C",
  frozen: "Congelado a -18 °C ou menos",
} as const satisfies Record<StorageCondition, string>;

export const SHELF_LIFE_UNITS = ["hours", "days"] as const;

export type ShelfLifeUnit = (typeof SHELF_LIFE_UNITS)[number];

export const SHELF_LIFE_UNIT_LABELS = {
  hours: "Horas",
  days: "Dias",
} as const satisfies Record<ShelfLifeUnit, string>;

export const HOURS_PER_DAY = 24;

export function toShelfLifeHours(amount: number, unit: ShelfLifeUnit): number {
  return unit === "days" ? amount * HOURS_PER_DAY : amount;
}

export function fromShelfLifeHours(hours: number): {
  amount: number;
  unit: ShelfLifeUnit;
} {
  return hours % HOURS_PER_DAY === 0
    ? { amount: hours / HOURS_PER_DAY, unit: "days" }
    : { amount: hours, unit: "hours" };
}
