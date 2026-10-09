import type { SelectOption } from "@/components/form/select-field";
import { NONE_SELECT_VALUE } from "@/lib/optional-select-value";
import { Constants } from "@/lib/supabase/database.types";
import type { TaskPeriod } from "./types";

export const TASK_PERIOD_VALUES = Constants.public.Enums.task_period;

export const TASK_PERIOD_LABELS = {
  opening: "Abertura",
  service: "Durante o expediente",
  closing: "Fechamento",
  cleaning: "Limpeza e manutenção",
  food_safety: "Segurança dos alimentos",
} as const satisfies Record<TaskPeriod, string>;

export const TASK_PERIOD_OPTIONS: readonly SelectOption[] = [
  { value: NONE_SELECT_VALUE, label: "Sem turno definido" },
  ...TASK_PERIOD_VALUES.map((period) => ({
    value: period,
    label: TASK_PERIOD_LABELS[period],
  })),
];

export function getPeriodOrder(period: TaskPeriod | null): number {
  return period === null
    ? TASK_PERIOD_VALUES.length
    : TASK_PERIOD_VALUES.indexOf(period);
}
