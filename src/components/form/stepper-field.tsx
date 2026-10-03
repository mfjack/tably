"use client";

import { Minus, Plus } from "lucide-react";
import { type Ref, useId, useRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormFieldShell, getFieldDescriptionId } from "./form-field-shell";
import type { FormFieldProps } from "./form-field-types";

type StepperFieldProps<TFieldValues extends FieldValues> = Omit<
  FormFieldProps<TFieldValues>,
  "placeholder" | "autoComplete"
> & {
  min: number;
  max: number;
  formatValue?: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
};

function formatPlainValue(value: number) {
  return value.toString();
}

type StepperControlProps = {
  id: string;
  value: number;
  min: number;
  max: number;
  formatValue: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
  outputRef: Ref<HTMLOutputElement>;
  onChange: (value: number) => void;
};

function StepperControl({
  id,
  value,
  min,
  max,
  formatValue,
  decreaseLabel,
  increaseLabel,
  outputRef,
  onChange,
}: StepperControlProps) {
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  function changeBy(step: number) {
    const nextValue = Math.min(
      Math.max(latestValueRef.current + step, min),
      max,
    );
    latestValueRef.current = nextValue;
    onChange(nextValue);
  }

  return (
    <div className="flex w-full items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 rounded-full"
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => changeBy(-1)}
      >
        <Minus aria-hidden />
      </Button>
      <output
        id={id}
        ref={outputRef}
        aria-live="polite"
        aria-describedby={getFieldDescriptionId(id)}
        className="flex-1 text-center font-bold text-3xl tabular-nums"
      >
        {formatValue(value)}
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 rounded-full"
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => changeBy(1)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}

export function StepperField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  isDescriptionCompact,
  labelAction,
  isLabelHidden,
  min,
  max,
  formatValue = formatPlainValue,
  decreaseLabel,
  increaseLabel,
}: StepperFieldProps<TFieldValues>) {
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
          isDescriptionCompact={isDescriptionCompact}
          labelAction={labelAction}
          isLabelHidden={isLabelHidden}
          error={fieldState.error}
        >
          <StepperControl
            id={inputId}
            value={Number.isFinite(field.value) ? field.value : 0}
            min={min}
            max={max}
            formatValue={formatValue}
            decreaseLabel={decreaseLabel}
            increaseLabel={increaseLabel}
            outputRef={field.ref}
            onChange={field.onChange}
          />
        </FormFieldShell>
      )}
    />
  );
}
