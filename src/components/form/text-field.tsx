"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type TextFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues> & {
    type?: "text" | "email" | "tel" | "url" | "date";
  };

export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAction,
  type = "text",
  placeholder,
  autoComplete,
}: TextFieldProps<TFieldValues>) {
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
          error={fieldState.error}
        >
          <Input
            {...field}
            value={field.value ?? ""}
            id={inputId}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
            aria-describedby={getFieldDescriptionId(inputId)}
            className={FORM_INPUT_CLASS_NAME}
          />
        </FormFieldShell>
      )}
    />
  );
}
