"use client";

import type { FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type TextareaFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues>;

export function TextareaField<TFieldValues extends FieldValues>({
  placeholder,
  autoComplete,
  ...fieldProps
}: TextareaFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <Textarea
          {...field}
          value={field.value ?? ""}
          id={inputId}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={fieldState.invalid}
          aria-describedby={getFieldDescriptionId(inputId)}
          className={cn(FORM_INPUT_CLASS_NAME, "h-auto min-h-20 py-2.5")}
        />
      )}
    />
  );
}
