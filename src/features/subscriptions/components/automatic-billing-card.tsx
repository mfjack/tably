"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, ExternalLink, QrCode } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MaskedField } from "@/components/form/masked-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { OrganizationId } from "@/features/organizations/types";
import type { AsaasBillingType } from "@/lib/asaas/types";
import {
  type AutomaticBillingInput,
  automaticBillingSchema,
} from "../automatic-billing-schemas";
import { useOpenAutomaticBillingInvoiceMutation } from "../hooks/use-open-automatic-billing-invoice-mutation";
import { useStartAutomaticBillingMutation } from "../hooks/use-start-automatic-billing-mutation";

const BILLING_TYPE_OPTIONS = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
] as const;

const BILLING_TYPE_DESCRIPTIONS = {
  PIX: "Todo mês sai uma cobrança Pix. Assim que você paga, a assinatura é renovada na hora.",
  CREDIT_CARD:
    "O cartão é cobrado sozinho todo mês. Você só informa os dados uma vez.",
} as const satisfies Record<AsaasBillingType, string>;

type AutomaticBillingCardProps = {
  organizationId: OrganizationId;
  defaultTaxId: string | null;
  activeBillingType: AsaasBillingType | null;
};

function openInvoice(invoiceUrl: string) {
  window.location.assign(invoiceUrl);
}

export function AutomaticBillingCard({
  organizationId,
  defaultTaxId,
  activeBillingType,
}: AutomaticBillingCardProps) {
  const [isChangingMethod, setIsChangingMethod] = useState(false);
  const startMutation = useStartAutomaticBillingMutation(organizationId);
  const openInvoiceMutation =
    useOpenAutomaticBillingInvoiceMutation(organizationId);
  const form = useForm<AutomaticBillingInput>({
    resolver: zodResolver(automaticBillingSchema),
    defaultValues: {
      billingType: activeBillingType ?? undefined,
      taxId: defaultTaxId ?? "",
    },
  });

  function submit(input: AutomaticBillingInput) {
    startMutation.mutate(input, {
      onSuccess: (invoiceUrl) => {
        toast.success("Cobrança automática ativada.", {
          description: "Abrindo a cobrança para você pagar.",
        });
        openInvoice(invoiceUrl);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function openPendingInvoice() {
    openInvoiceMutation.mutate(undefined, {
      onSuccess: openInvoice,
      onError: (error) => toast.error(error.message),
    });
  }

  if (activeBillingType && !isChangingMethod) {
    const Icon = activeBillingType === "PIX" ? QrCode : CreditCard;
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              Cobrança automática ativa ·{" "}
              {activeBillingType === "PIX" ? "Pix" : "Cartão de crédito"}
            </span>
            <span className="text-muted-foreground text-sm">
              {BILLING_TYPE_DESCRIPTIONS[activeBillingType]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-10"
            disabled={openInvoiceMutation.isPending}
            onClick={openPendingInvoice}
          >
            {openInvoiceMutation.isPending ? (
              <Spinner aria-hidden />
            ) : (
              <ExternalLink aria-hidden />
            )}
            Abrir cobrança em aberto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => setIsChangingMethod(true)}
          >
            Trocar forma de pagamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      noValidate
    >
      <div className="flex flex-col gap-1">
        <span className="font-semibold">Cobrança automática</span>
        <span className="text-muted-foreground text-sm">
          Escolha como pagar e a assinatura renova sozinha, sem precisar avisar
          que pagou.
        </span>
      </div>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={form.control}
          name="billingType"
          label="Forma de pagamento"
          options={BILLING_TYPE_OPTIONS}
        />
        <MaskedField
          control={form.control}
          name="taxId"
          label="CPF ou CNPJ de quem paga"
          mask="cpfCnpj"
          placeholder="000.000.000-00"
        />
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className="h-10"
          disabled={startMutation.isPending}
        >
          {startMutation.isPending && <Spinner aria-hidden />}
          Ativar e pagar
        </Button>
        {isChangingMethod && (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={startMutation.isPending}
            onClick={() => setIsChangingMethod(false)}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
