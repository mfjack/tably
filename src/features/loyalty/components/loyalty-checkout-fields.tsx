"use client";

import { Check, Gift } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import { MaskedField } from "@/components/form/masked-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLoyaltyCustomerLookupQuery } from "../hooks/use-loyalty-customer-lookup-query";
import { LOYALTY_PHONE_PATTERN } from "../schemas";
import type { LoyaltyCustomerLookup, LoyaltyProgram } from "../types";

export type LoyaltyCheckoutFormInput = {
  phone: string;
  name: string;
};

export const EMPTY_LOYALTY_CHECKOUT: LoyaltyCheckoutFormInput = {
  phone: "",
  name: "",
};

export type LoyaltyRewardOption = {
  productId: string;
  productName: string;
  unitPrice: number;
};

type LoyaltyCheckoutFieldsProps = {
  organizationId: OrganizationId;
  program: LoyaltyProgram;
  control: Control<LoyaltyCheckoutFormInput>;
  orderTotal: number;
  rewardOptions: readonly LoyaltyRewardOption[];
  rewardProductId: string | null;
  isRewardAvailable: boolean;
  onRewardProductChange: (productId: string | null) => void;
};

type RewardPickerProps = {
  program: LoyaltyProgram;
  options: readonly LoyaltyRewardOption[];
  selectedProductId: string | null;
  onChange: (productId: string | null) => void;
};

function RewardPicker({
  program,
  options,
  selectedProductId,
  onChange,
}: RewardPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex items-center gap-1.5 font-semibold text-primary text-sm">
        <Gift aria-hidden className="size-4" />
        Este cliente tem um prêmio para usar: {program.rewardDescription}
      </legend>
      <p className="text-muted-foreground text-xs">
        Escolha o item que sai de graça.
      </p>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = option.productId === selectedProductId;
          return (
            <Button
              key={option.productId}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="h-10 justify-between"
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : option.productId)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {isSelected && <Check aria-hidden />}
                <span className="truncate">{option.productName}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(option.unitPrice)}
              </span>
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

type CustomerStatusProps = {
  customer: LoyaltyCustomerLookup;
  program: LoyaltyProgram;
  isRewardAvailable: boolean;
  rewardOptions: readonly LoyaltyRewardOption[];
  rewardProductId: string | null;
  onRewardProductChange: (productId: string | null) => void;
};

function CustomerStatus({
  customer,
  program,
  isRewardAvailable,
  rewardOptions,
  rewardProductId,
  onRewardProductChange,
}: CustomerStatusProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg px-4 py-3",
        isRewardAvailable
          ? "border border-primary/40 bg-primary/10"
          : "bg-muted",
      )}
    >
      <p className="text-sm">
        <span className="font-semibold">{customer.name}</span>
        <span className="text-muted-foreground">
          {" "}
          · {customer.balance} de {program.stampsRequired} selos
        </span>
      </p>
      {customer.hasStampToday && !isRewardAvailable && (
        <p
          role="status"
          className="rounded-md bg-amber-500/15 px-2.5 py-1.5 font-medium text-amber-800 text-xs dark:text-amber-300"
        >
          Selo de hoje já foi ganho. Esta compra não soma outro selo.
        </p>
      )}
      {isRewardAvailable && rewardOptions.length > 0 && (
        <RewardPicker
          program={program}
          options={rewardOptions}
          selectedProductId={rewardProductId}
          onChange={onRewardProductChange}
        />
      )}
    </div>
  );
}

export function LoyaltyCheckoutFields({
  organizationId,
  program,
  control,
  orderTotal,
  rewardOptions,
  rewardProductId,
  isRewardAvailable,
  onRewardProductChange,
}: LoyaltyCheckoutFieldsProps) {
  const phone = useWatch({ control, name: "phone" });
  const lookupQuery = useLoyaltyCustomerLookupQuery(organizationId, phone);
  const isPhoneComplete = LOYALTY_PHONE_PATTERN.test(phone);
  const customer = lookupQuery.data;
  const isSearching =
    lookupQuery.fetchStatus === "fetching" && customer === undefined;
  const isLookupUnavailable =
    customer === undefined &&
    !isSearching &&
    (lookupQuery.isError || lookupQuery.isPaused);
  const earnsStamp = orderTotal >= program.minimumPurchase;

  return (
    <section className="flex flex-col gap-3">
      <MaskedField
        control={control}
        name="phone"
        label="Fidelidade"
        description={
          isRewardAvailable && rewardProductId
            ? "Compra com prêmio não ganha selo."
            : earnsStamp
              ? "Celular do cliente para ganhar o selo desta compra. Opcional."
              : `Compras a partir de ${formatCurrency(program.minimumPurchase)} ganham selo.`
        }
        isDescriptionCompact
        mask="phone"
        placeholder="00 00000-0000"
        autoComplete="off"
      />
      {isPhoneComplete && isSearching && (
        <p className="text-muted-foreground text-sm">Buscando cliente…</p>
      )}
      {isPhoneComplete && customer && (
        <CustomerStatus
          customer={customer}
          program={program}
          isRewardAvailable={isRewardAvailable}
          rewardOptions={rewardOptions}
          rewardProductId={rewardProductId}
          onRewardProductChange={onRewardProductChange}
        />
      )}
      {isPhoneComplete && (customer === null || isLookupUnavailable) && (
        <TextField
          control={control}
          name="name"
          label="Nome do cliente"
          description={
            isLookupUnavailable
              ? "Sem conexão para buscar o cliente. Se for cliente novo, informe o nome."
              : "Cliente novo: o cadastro é feito junto com esta compra."
          }
          placeholder="Ex.: Ana"
          autoComplete="off"
        />
      )}
    </section>
  );
}
