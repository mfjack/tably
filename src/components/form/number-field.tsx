"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

const INPUT_SIZE_CLASS_NAMES = {
  default: "",
  compact: "h-9 px-3 text-sm md:text-sm",
} as const;

const NUMBER_FORMAT_PRESETS = {
  currency: {
    prefix: `${CURRENCY_SYMBOL} `,
    decimalScale: 2,
    fixedDecimalScale: true,
  },
  quantity: { prefix: undefined, decimalScale: 3, fixedDecimalScale: false },
} as const;

type NumberFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  format: keyof typeof NUMBER_FORMAT_PRESETS;
  suffix?: string;
  isDisabled?: boolean;
  size?: keyof typeof INPUT_SIZE_CLASS_NAMES;
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
  size = "default",
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
            className={cn(FORM_INPUT_CLASS_NAME, INPUT_SIZE_CLASS_NAMES[size])}
          />
        </FormFieldShell>
      )}
    />
  );
}
