"use client";

import { useId } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { NumberFormatBase } from "react-number-format";
import { Input } from "@/components/ui/input";
import {
  applyDigitPattern,
  CBO_PATTERN,
  CNPJ_PATTERN,
  CPF_PATTERN,
  getBoletoPattern,
  getPhonePattern,
  onlyDigits,
  PIS_PATTERN,
} from "@/lib/masks";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import { FORM_INPUT_CLASS_NAME } from "./form-field-styles";
import type { FormFieldProps } from "./form-field-types";

const MASK_PRESETS = {
  cnpj: { getPattern: () => CNPJ_PATTERN, maxDigits: 14, inputMode: "numeric" },
  cpf: { getPattern: () => CPF_PATTERN, maxDigits: 11, inputMode: "numeric" },
  pis: { getPattern: () => PIS_PATTERN, maxDigits: 11, inputMode: "numeric" },
  phone: { getPattern: getPhonePattern, maxDigits: 11, inputMode: "tel" },
  pin: { getPattern: () => "####", maxDigits: 4, inputMode: "numeric" },
  cbo: { getPattern: () => CBO_PATTERN, maxDigits: 6, inputMode: "numeric" },
  boleto: { getPattern: getBoletoPattern, maxDigits: 48, inputMode: "numeric" },
} as const;

type MaskedFieldProps<TFieldValues extends FieldValues> =
  FormFieldProps<TFieldValues> & {
    mask: keyof typeof MASK_PRESETS;
  };

export function MaskedField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAction,
  isLabelHidden,
  placeholder,
  autoComplete,
  mask,
}: MaskedFieldProps<TFieldValues>) {
  const inputId = useId();
  const preset = MASK_PRESETS[mask];

  function formatDigits(value: string) {
    const digits = onlyDigits(value).slice(0, preset.maxDigits);
    return applyDigitPattern(digits, preset.getPattern(digits));
  }

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
          <NumberFormatBase
            customInput={Input}
            getInputRef={field.ref}
            id={inputId}
            name={field.name}
            value={field.value ?? ""}
            valueIsNumericString
            format={formatDigits}
            removeFormatting={(value) =>
              onlyDigits(value).slice(0, preset.maxDigits)
            }
            getCaretBoundary={(formattedValue) =>
              Array.from({ length: formattedValue.length + 1 }, () => true)
            }
            onValueChange={({ value }) => field.onChange(value)}
            onBlur={field.onBlur}
            inputMode={preset.inputMode}
            autoComplete={autoComplete}
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
