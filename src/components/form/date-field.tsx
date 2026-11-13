"use client";

import type { FieldValues } from "react-hook-form";
import { DatePicker } from "@/components/date-picker";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

type DateFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
>;

export function DateField<TFieldValues extends FieldValues>({
  placeholder = "Selecione a data",
  ...fieldProps
}: DateFieldProps<TFieldValues>) {
  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <DatePicker
          id={inputId}
          value={field.value ?? ""}
          placeholder={placeholder}
          className={FORM_INPUT_CLASS_NAME}
          isInvalid={fieldState.invalid}
          describedBy={getFieldDescriptionId(inputId)}
          triggerRef={field.ref}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}
