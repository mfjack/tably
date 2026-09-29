"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
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
  control,
  name,
  label,
  description,
  labelAction,
  isLabelHidden,
  placeholder = "Selecione",
  options,
  isDisabled = false,
}: SelectFieldProps<TFieldValues>) {
  const inputId = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell
          inputId={inputId}
          label={label}
          description={description}
          labelAction={labelAction}
          isLabelHidden={isLabelHidden}
          error={fieldState.error}
        >
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
        </FormFieldShell>
      )}
    />
  );
}
