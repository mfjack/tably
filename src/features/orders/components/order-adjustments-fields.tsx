"use client";

import { Percent, X } from "lucide-react";
import { type Control, useController, useWatch } from "react-hook-form";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import {
  DISCOUNT_TYPES,
  type DiscountType,
  type OrderTotals,
} from "../order-adjustments";

export type AdjustmentsFormInput = {
  hasServiceFee: boolean;
  hasDiscount: boolean;
  discountType: DiscountType;
  discountValue?: number;
};

const DISCOUNT_TYPE_LABELS = {
  percent: "Porcentagem (%)",
  amount: "Valor fixo ($)",
} as const satisfies Record<DiscountType, string>;

const INVALID_DISCOUNT_MESSAGE =
  "O desconto precisa ser maior que zero e menor que o total.";

type OrderAdjustmentsFieldsProps = {
  control: Control<AdjustmentsFormInput>;
  serviceFeePercent: number;
  canChargeServiceFee: boolean;
  isDiscountEnabled: boolean;
  totals: OrderTotals;
};

function isDiscountType(value: string): value is DiscountType {
  return DISCOUNT_TYPES.some((discountType) => discountType === value);
}

function formatPercent(percent: number) {
  return `${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function OrderAdjustmentsFields({
  control,
  serviceFeePercent,
  canChargeServiceFee,
  isDiscountEnabled,
  totals,
}: OrderAdjustmentsFieldsProps) {
  const hasDiscountField = useController({ control, name: "hasDiscount" });
  const discountTypeField = useController({ control, name: "discountType" });
  const discountValue = useWatch({ control, name: "discountValue" });
  const hasDiscount = hasDiscountField.field.value;
  const discountType = discountTypeField.field.value;
  const isDiscountInvalid =
    hasDiscount && discountValue !== undefined && !totals.isDiscountValid;

  return (
    <div className="flex flex-col gap-4">
      {canChargeServiceFee && serviceFeePercent > 0 && (
        <SwitchField
          control={control}
          name="hasServiceFee"
          label={`Taxa de serviço (${formatPercent(serviceFeePercent)})`}
          description={
            totals.serviceFee > 0
              ? `Soma ${formatCurrency(totals.serviceFee)} à conta.`
              : "Desligada. O cliente não paga a taxa."
          }
        />
      )}

      {!isDiscountEnabled ? null : hasDiscount ? (
        <div className="flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-sm">Desconto</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remover desconto"
              onClick={() => hasDiscountField.field.onChange(false)}
            >
              <X aria-hidden />
            </Button>
          </div>
          <Tabs
            value={discountType}
            onValueChange={(value: string) => {
              if (isDiscountType(value))
                discountTypeField.field.onChange(value);
            }}
          >
            <TabsList className="w-full group-data-horizontal/tabs:h-10">
              {DISCOUNT_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {DISCOUNT_TYPE_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <NumberField
            control={control}
            name="discountValue"
            label={discountType === "percent" ? "Porcentagem" : "Valor"}
            isLabelHidden
            format={discountType === "percent" ? "percent" : "currency"}
            suffix={discountType === "percent" ? "%" : undefined}
            placeholder={
              discountType === "percent" ? "Ex.: 10 %" : "Ex.: $ 5,00"
            }
          />
          {isDiscountInvalid ? (
            <FieldError>{INVALID_DISCOUNT_MESSAGE}</FieldError>
          ) : (
            totals.discount > 0 && (
              <p className="text-muted-foreground text-sm">
                Tira {formatCurrency(totals.discount)} da conta.
              </p>
            )
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => hasDiscountField.field.onChange(true)}
        >
          <Percent aria-hidden />
          Adicionar desconto
        </Button>
      )}
    </div>
  );
}
