"use client";

import type { FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type TextFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues> & {
    type?: "text" | "email" | "tel" | "url" | "date" | "time" | "month";
  };

export function TextField<TFieldValues extends FieldValues>({
  type = "text",
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
          className={FORM_INPUT_CLASS_NAME}
        />
      )}
    />
  );
}
