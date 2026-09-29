"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { FormFieldProps } from "./form-field-types";

type SwitchFieldProps<TFieldValues extends FieldValues> = Pick<
  FormFieldProps<TFieldValues>,
  "control" | "name" | "label" | "description"
>;

export function SwitchField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: SwitchFieldProps<TFieldValues>) {
  const switchId = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal" className="rounded-lg border px-4 py-3">
          <FieldContent>
            <FieldLabel htmlFor={switchId}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
          <Switch
            id={switchId}
            ref={field.ref}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
          />
        </Field>
      )}
    />
  );
}
