"use client";

import { Gift } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { MaskedField } from "@/components/form/masked-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { useLoyaltyCustomerLookupQuery } from "../hooks/use-loyalty-customer-lookup-query";
import { useRedeemLoyaltyRewardMutation } from "../hooks/use-redeem-loyalty-reward-mutation";
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

type LoyaltyCheckoutFieldsProps = {
  organizationId: OrganizationId;
  program: LoyaltyProgram;
  control: Control<LoyaltyCheckoutFormInput>;
  orderTotal: number;
};

type CustomerStatusProps = {
  customer: LoyaltyCustomerLookup;
  program: LoyaltyProgram;
  isRedeeming: boolean;
  onRedeem: () => void;
};

function CustomerStatus({
  customer,
  program,
  isRedeeming,
  onRedeem,
}: CustomerStatusProps) {
  const canRedeem = customer.balance >= program.stampsRequired;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted px-4 py-3">
      <p className="text-sm">
        <span className="font-semibold">{customer.name}</span>
        <span className="text-muted-foreground">
          {" "}
          · {customer.balance} de {program.stampsRequired} selos
        </span>
      </p>
      {customer.hasStampToday && (
        <p
          role="status"
          className="rounded-md bg-amber-500/15 px-2.5 py-1.5 font-medium text-amber-800 text-xs dark:text-amber-300"
        >
          Selo de hoje já foi ganho. Esta compra não soma outro selo.
        </p>
      )}
      {canRedeem && (
        <Button
          type="button"
          variant="outline"
          className="h-10 justify-start"
          disabled={isRedeeming}
          onClick={onRedeem}
        >
          <Gift aria-hidden />
          Resgatar prêmio: {program.rewardDescription}
        </Button>
      )}
    </div>
  );
}

export function LoyaltyCheckoutFields({
  organizationId,
  program,
  control,
  orderTotal,
}: LoyaltyCheckoutFieldsProps) {
  const phone = useWatch({ control, name: "phone" });
  const lookupQuery = useLoyaltyCustomerLookupQuery(organizationId, phone);
  const redeemMutation = useRedeemLoyaltyRewardMutation(organizationId);
  const isPhoneComplete = LOYALTY_PHONE_PATTERN.test(phone);
  const customer = lookupQuery.data;
  const isSearching =
    lookupQuery.fetchStatus === "fetching" && customer === undefined;
  const isLookupUnavailable =
    customer === undefined &&
    !isSearching &&
    (lookupQuery.isError || lookupQuery.isPaused);
  const earnsStamp = orderTotal >= program.minimumPurchase;

  function redeemReward() {
    if (!customer) return;
    redeemMutation.mutate(customer.id, {
      onSuccess: () => {
        toast.success("Prêmio resgatado.", {
          description: `Entregue ${program.rewardDescription} sem cobrar.`,
        });
        void lookupQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <MaskedField
        control={control}
        name="phone"
        label="Fidelidade"
        description={
          earnsStamp
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
          isRedeeming={redeemMutation.isPending}
          onRedeem={redeemReward}
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
