"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateAdminSubscriptionMutation } from "@/features/subscriptions/hooks/use-update-admin-subscription-mutation";
import {
  PLAN_DETAILS,
  SUBSCRIPTION_PLANS,
} from "@/features/subscriptions/plans";
import {
  type AdminSubscriptionInput,
  adminSubscriptionSchema,
} from "@/features/subscriptions/schemas";
import type { AdminSubscription } from "@/features/subscriptions/types";

const PLAN_OPTIONS = SUBSCRIPTION_PLANS.map((plan) => ({
  value: plan,
  label: `${PLAN_DETAILS[plan].label} (R$ ${PLAN_DETAILS[plan].price})`,
}));

type AdminSubscriptionDialogProps = {
  subscription: AdminSubscription | null;
  onClose: () => void;
};

function toFormValues(subscription: AdminSubscription): AdminSubscriptionInput {
  return {
    plan: subscription.plan,
    monthlyPrice: subscription.monthlyPrice,
    trialEndsAt: format(new Date(subscription.trialEndsAt), "yyyy-MM-dd"),
    notes: subscription.notes ?? "",
  };
}

export function AdminSubscriptionDialog({
  subscription,
  onClose,
}: AdminSubscriptionDialogProps) {
  const updateMutation = useUpdateAdminSubscriptionMutation();
  const form = useForm<AdminSubscriptionInput>({
    resolver: zodResolver(adminSubscriptionSchema),
  });

  useEffect(() => {
    if (subscription) form.reset(toFormValues(subscription));
  }, [subscription, form]);

  const handleSubmit = form.handleSubmit((input) => {
    if (!subscription) return;
    updateMutation.mutate(
      { organizationId: subscription.organizationId, input },
      {
        onSuccess: () => {
          toast.success(`${subscription.name} atualizado.`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={subscription !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={subscription ? `Editar ${subscription.name}` : "Editar cliente"}
      submitLabel="Salvar"
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SelectField
          control={form.control}
          name="plan"
          label="Plano"
          options={PLAN_OPTIONS}
        />
        <NumberField
          control={form.control}
          name="monthlyPrice"
          label="Valor mensal"
          description="Quanto este cliente paga por mês, e o valor do QR Code Pix dele. Pode ser diferente do preço do plano, como um desconto para amigos."
          format="currency"
          placeholder="Ex.: $ 49,00"
        />
        <TextField
          control={form.control}
          name="trialEndsAt"
          label="Teste grátis até"
          type="date"
        />
        <TextareaField
          control={form.control}
          name="notes"
          label="Anotações"
          placeholder="Ex.: Amiga, paga o Essencial com tudo liberado"
        />
      </FieldGroup>
    </FormDialog>
  );
}
