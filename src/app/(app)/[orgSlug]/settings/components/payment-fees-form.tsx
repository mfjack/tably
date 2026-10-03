"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdatePaymentFeesMutation } from "@/features/organizations/hooks/use-update-payment-fees-mutation";
import {
  type PaymentFeesInput,
  paymentFeesSchema,
} from "@/features/organizations/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type PaymentFeesFormProps = {
  organization: UserOrganization;
};

function toFormValues({ paymentFees }: UserOrganization): PaymentFeesInput {
  return {
    creditCardFeePercent: paymentFees.creditCardFeePercent || undefined,
    debitCardFeePercent: paymentFees.debitCardFeePercent || undefined,
    pixFeePercent: paymentFees.pixFeePercent || undefined,
    isPassedOnToCustomer: paymentFees.isPassedOnToCustomer,
  };
}

export function PaymentFeesForm({ organization }: PaymentFeesFormProps) {
  const router = useRouter();
  const updateFeesMutation = useUpdatePaymentFeesMutation(organization.id);
  const form = useForm<PaymentFeesInput>({
    resolver: zodResolver(paymentFeesSchema),
    defaultValues: toFormValues(organization),
  });

  const handleSubmit = form.handleSubmit((values) =>
    updateFeesMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Taxas salvas.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <SettingsFormSection
      title="Taxas de pagamento"
      description="Quanto a maquininha ou o banco descontam de cada venda. O relatório de vendas mostra o que você vai receber. Vale para as vendas feitas depois de salvar."
      isDirty={form.formState.isDirty}
      isSubmitting={updateFeesMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup className="grid gap-5 sm:grid-cols-3">
        <NumberField
          control={form.control}
          name="creditCardFeePercent"
          label="Crédito"
          format="precisePercent"
          suffix="%"
          placeholder="Ex.: 3,49 %"
        />
        <NumberField
          control={form.control}
          name="debitCardFeePercent"
          label="Débito"
          format="precisePercent"
          suffix="%"
          placeholder="Ex.: 1,99 %"
        />
        <NumberField
          control={form.control}
          name="pixFeePercent"
          label="Pix"
          format="precisePercent"
          suffix="%"
          placeholder="Ex.: 0 %"
        />
      </FieldGroup>
      <SwitchField
        control={form.control}
        name="isPassedOnToCustomer"
        label="Repassar a taxa ao cliente"
        description="No cartão e no Pix com taxa, o valor cobrado já inclui a taxa. Você recebe o valor da venda inteiro."
      />
    </SettingsFormSection>
  );
}
