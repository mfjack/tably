"use client";

import { useId } from "react";
import { type Control, Controller } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_METHODS,
} from "@/features/orders/payment-methods";
import type { OrderPaymentInput } from "@/features/orders/schemas";

type PaymentMethodFieldProps = {
  control: Control<OrderPaymentInput>;
};

export function PaymentMethodField({ control }: PaymentMethodFieldProps) {
  const fieldId = useId();

  return (
    <Controller
      control={control}
      name="method"
      render={({ field, fieldState }) => (
        <FieldSet>
          <FieldLegend variant="label">Forma de pagamento</FieldLegend>
          <RadioGroup
            value={field.value ?? null}
            onValueChange={field.onChange}
            aria-invalid={fieldState.invalid}
            className="grid-cols-2"
          >
            {PAYMENT_METHOD_VALUES.map((method) => {
              const { label, icon: Icon } = PAYMENT_METHODS[method];
              const optionId = `${fieldId}-${method}`;
              return (
                <FieldLabel key={method} htmlFor={optionId}>
                  <Field orientation="horizontal" className="items-center">
                    <Icon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <FieldTitle>{label}</FieldTitle>
                    <RadioGroupItem
                      value={method}
                      id={optionId}
                      className="ml-auto"
                    />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          {fieldState.error && (
            <FieldError errors={[fieldState.error]} className="text-[13px]" />
          )}
        </FieldSet>
      )}
    />
  );
}
