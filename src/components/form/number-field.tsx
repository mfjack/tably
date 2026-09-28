"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

const NUMBER_FORMAT_PRESETS = {
  currency: { prefix: "R$ ", decimalScale: 2, fixedDecimalScale: true },
  quantity: { prefix: undefined, decimalScale: 3, fixedDecimalScale: false },
} as const;

type NumberFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  format: keyof typeof NUMBER_FORMAT_PRESETS;
  suffix?: string;
  isDisabled?: boolean;
};

export function NumberField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAction,
  isLabelHidden,
  placeholder,
  format,
  suffix,
  isDisabled = false,
}: NumberFieldProps<TFieldValues>) {
  const inputId = useId();
  const preset = NUMBER_FORMAT_PRESETS[format];

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
          <NumericFormat
            customInput={Input}
            getInputRef={field.ref}
            id={inputId}
            name={field.name}
            value={Number.isFinite(field.value) ? field.value : ""}
            onValueChange={({ floatValue }) => field.onChange(floatValue)}
            onBlur={field.onBlur}
            disabled={isDisabled}
            inputMode="decimal"
            thousandSeparator="."
            decimalSeparator=","
            allowNegative={false}
            prefix={preset.prefix}
            suffix={suffix ? ` ${suffix}` : undefined}
            decimalScale={preset.decimalScale}
            fixedDecimalScale={preset.fixedDecimalScale}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            aria-describedby={getFieldDescriptionId(inputId)}
            className={FORM_INPUT_CLASS_NAME}
          />
        </FormFieldShell>
      )}
    />
  );
}
