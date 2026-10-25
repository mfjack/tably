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

export const SHELF_LIFE_MODES = ["days", "date"] as const;

export type ShelfLifeMode = (typeof SHELF_LIFE_MODES)[number];

export const SHELF_LIFE_MODE_LABELS = {
  days: "Dias",
  date: "Data",
} as const satisfies Record<ShelfLifeMode, string>;

const HOURS_PER_DAY = 24;

export function toShelfLifeHours(days: number): number {
  return days * HOURS_PER_DAY;
}

export function toShelfLifeDays(hours: number): number {
  return Math.max(1, Math.round(hours / HOURS_PER_DAY));
}
