"use client";

import type { FieldValues } from "react-hook-form";
import { ToggleChip } from "@/components/toggle-chip";
import { getWeekdayLabel, ISO_WEEKDAYS } from "@/lib/weekdays";
import { ControlledFormField } from "./controlled-form-field";
import type { FormFieldProps } from "./form-field-types";

type WeekdayChipsFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "placeholder" | "autoComplete"
>;

function toggleWeekday(
  selectedWeekdays: readonly number[],
  weekday: number,
): number[] {
  return selectedWeekdays.includes(weekday)
    ? selectedWeekdays.filter((selectedWeekday) => selectedWeekday !== weekday)
    : [...selectedWeekdays, weekday].sort((first, second) => first - second);
}

export function WeekdayChipsField<TFieldValues extends FieldValues>(
  props: WeekdayChipsFieldProps<TFieldValues>,
) {
  return (
    <ControlledFormField
      {...props}
      render={({ field }) => {
        const selectedWeekdays: number[] = field.value ?? [];
        return (
          <div className="flex flex-wrap gap-2">
            {ISO_WEEKDAYS.map((weekday) => (
              <ToggleChip
                key={weekday}
                label={getWeekdayLabel(weekday)}
                isSelected={selectedWeekdays.includes(weekday)}
                onToggle={() =>
                  field.onChange(toggleWeekday(selectedWeekdays, weekday))
                }
              />
            ))}
          </div>
        );
      }}
    />
  );
}
