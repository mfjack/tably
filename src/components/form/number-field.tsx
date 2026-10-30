"use client";

import type { FocusEvent } from "react";
import type { FieldValues } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ControlledFormField } from "./controlled-form-field";
import { getFieldDescriptionId } from "./form-field-shell";
import {
  FORM_INPUT_CLASS_NAME,
  FORM_INPUT_SIZE_CLASS_NAMES,
  type FormInputSize,
} from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

const NUMBER_FORMAT_PRESETS = {
  currency: {
    prefix: `${CURRENCY_SYMBOL} `,
    decimalScale: 2,
    fixedDecimalScale: true,
  },
  quantity: { prefix: undefined, decimalScale: 3, fixedDecimalScale: false },
  integer: { prefix: undefined, decimalScale: 0, fixedDecimalScale: false },
  percent: { prefix: undefined, decimalScale: 1, fixedDecimalScale: false },
  temperature: { prefix: undefined, decimalScale: 1, fixedDecimalScale: false },
  precisePercent: {
    prefix: undefined,
    decimalScale: 2,
    fixedDecimalScale: false,
  },
} as const;

type NumberFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "autoComplete"
> & {
  format: keyof typeof NUMBER_FORMAT_PRESETS;
  suffix?: string;
  isDisabled?: boolean;
  allowsNegative?: boolean;
  size?: FormInputSize;
};

function selectInputValue(event: FocusEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  requestAnimationFrame(() => input.select());
}

export function NumberField<TFieldValues extends FieldValues>({
  placeholder,
  format,
  suffix,
  isDisabled = false,
  allowsNegative = false,
  size = "default",
  ...fieldProps
}: NumberFieldProps<TFieldValues>) {
  const preset = NUMBER_FORMAT_PRESETS[format];

  return (
    <ControlledFormField
      {...fieldProps}
      render={({ field, fieldState, inputId }) => (
        <NumericFormat
          customInput={Input}
          getInputRef={field.ref}
          id={inputId}
          name={field.name}
          value={Number.isFinite(field.value) ? field.value : ""}
          onValueChange={({ floatValue }) => field.onChange(floatValue)}
          onBlur={field.onBlur}
          onFocus={selectInputValue}
          disabled={isDisabled}
          inputMode="decimal"
          thousandSeparator="."
          decimalSeparator=","
          allowNegative={allowsNegative}
          prefix={preset.prefix}
          suffix={suffix ? ` ${suffix}` : undefined}
          decimalScale={preset.decimalScale}
          fixedDecimalScale={preset.fixedDecimalScale}
          placeholder={placeholder}
          aria-invalid={fieldState.invalid}
          aria-describedby={getFieldDescriptionId(inputId)}
          className={cn(
            FORM_INPUT_CLASS_NAME,
            FORM_INPUT_SIZE_CLASS_NAMES[size],
          )}
        />
      )}
    />
  );
}
