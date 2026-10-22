"use client";

import type { FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  options: readonly SelectOption[];
  isDisabled?: boolean;
};

export function SelectField<TFieldValues extends FieldValues>({
  placeholder = "Selecione",
  options,
  isDisabled = false,
  ...fieldProps
}: SelectFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <Select
          items={options}
          value={field.value ?? null}
          onValueChange={(value) => field.onChange(value ?? undefined)}
          disabled={isDisabled}
        >
          <SelectTrigger
            id={inputId}
            ref={field.ref}
            onBlur={field.onBlur}
            aria-invalid={fieldState.invalid}
            aria-describedby={getFieldDescriptionId(inputId)}
            className={cn(
              FORM_INPUT_CLASS_NAME,
              "w-full pr-3 data-[size=default]:h-12",
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            className="rounded-lg"
          >
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="py-2.5 text-[0.9375rem]"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
