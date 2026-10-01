"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateCheckoutSettingsMutation } from "@/features/organizations/hooks/use-update-checkout-settings-mutation";
import {
  type CheckoutSettingsInput,
  checkoutSettingsSchema,
} from "@/features/organizations/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type CheckoutSettingsFormProps = {
  organization: UserOrganization;
};

function toFormValues({ checkout }: UserOrganization): CheckoutSettingsInput {
  return {
    isServiceFeeEnabled: checkout.isServiceFeeEnabled,
    serviceFeePercent: checkout.serviceFeePercent || undefined,
    isDiscountEnabled: checkout.isDiscountEnabled,
    isSplitBillEnabled: checkout.isSplitBillEnabled,
    isCustomerAccountPaymentEnabled: checkout.isCustomerAccountPaymentEnabled,
  };
}

export function CheckoutSettingsForm({
  organization,
}: CheckoutSettingsFormProps) {
  const router = useRouter();
  const updateSettingsMutation = useUpdateCheckoutSettingsMutation(
    organization.id,
  );
  const form = useForm<CheckoutSettingsInput>({
    resolver: zodResolver(checkoutSettingsSchema),
    defaultValues: toFormValues(organization),
  });
  const isServiceFeeEnabled = useWatch({
    control: form.control,
    name: "isServiceFeeEnabled",
  });

  const handleSubmit = form.handleSubmit((values) =>
    updateSettingsMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Alterações salvas.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <SettingsFormSection
      title="Vendas"
      description="Escolha o que aparece na hora de cobrar, no PDV e nas comandas."
      isDirty={form.formState.isDirty}
      isSubmitting={updateSettingsMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SwitchField
          control={form.control}
          name="isServiceFeeEnabled"
          label="Taxa de serviço"
          description="Sugerida ao cobrar comandas para consumo no local. O operador pode tirar se o cliente recusar."
        />
        {isServiceFeeEnabled && (
          <NumberField
            control={form.control}
            name="serviceFeePercent"
            label="Porcentagem da taxa"
            format="percent"
            suffix="%"
            placeholder="Ex.: 10 %"
          />
        )}
        <SwitchField
          control={form.control}
          name="isDiscountEnabled"
          label="Desconto"
          description="Permite dar desconto em porcentagem ou valor fixo ao cobrar."
        />
        <SwitchField
          control={form.control}
          name="isSplitBillEnabled"
          label="Dividir conta"
          description="Permite dividir o pagamento entre pessoas ou formas de pagamento."
        />
        <SwitchField
          control={form.control}
          name="isCustomerAccountPaymentEnabled"
          label="Venda na conta"
          description="Mostra a forma de pagamento Conta, para lançar a venda na conta do cliente e receber depois."
        />
      </FieldGroup>
    </SettingsFormSection>
  );
}
