"use client";

import { type ReactNode, useId } from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { FormFieldShell } from "./form-field-shell";
import type { FormFieldProps } from "./form-field-types";

type ControlledFormFieldRenderProps<TFieldValues extends FieldValues> = {
  field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
  fieldState: ControllerFieldState;
  inputId: string;
};

type ControlledFormFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "placeholder" | "autoComplete"
> & {
  render: (props: ControlledFormFieldRenderProps<TFieldValues>) => ReactNode;
};

export function ControlledFormField<TFieldValues extends FieldValues>({
  control,
  name,
  render,
  ...shellProps
}: ControlledFormFieldProps<TFieldValues>) {
  const inputId = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell
          {...shellProps}
          inputId={inputId}
          error={fieldState.error}
        >
          {render({ field, fieldState, inputId })}
        </FormFieldShell>
      )}
    />
  );
}
