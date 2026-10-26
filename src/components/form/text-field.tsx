"use client";

import type { MouseEvent } from "react";
import type { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import {
  FORM_INPUT_CLASS_NAME,
  FORM_INPUT_SIZE_CLASS_NAMES,
  type FormInputSize,
} from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type TextFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues> & {
    type?: "text" | "email" | "tel" | "url" | "date" | "time" | "month";
    size?: FormInputSize;
  };

const TIME_INPUT_CLASS_NAME =
  "tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:mx-auto [&::-webkit-datetime-edit]:flex-none";

function openTimePicker(event: MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.();
}

export function TextField<TFieldValues extends FieldValues>({
  type = "text",
  size = "default",
  placeholder,
  autoComplete,
  ...fieldProps
}: TextFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <Input
          {...field}
          value={field.value ?? ""}
          id={inputId}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={fieldState.invalid}
          aria-describedby={getFieldDescriptionId(inputId)}
          onClick={type === "time" ? openTimePicker : undefined}
          className={cn(
            FORM_INPUT_CLASS_NAME,
            FORM_INPUT_SIZE_CLASS_NAMES[size],
            type === "time" && TIME_INPUT_CLASS_NAME,
          )}
        />
      )}
    />
  );
}
