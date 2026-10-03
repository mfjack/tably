"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveLoyaltySettingsMutation } from "@/features/loyalty/hooks/use-save-loyalty-settings-mutation";
import {
  type LoyaltySettingsInput,
  loyaltySettingsSchema,
} from "@/features/loyalty/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type LoyaltySettingsFormProps = {
  organization: UserOrganization;
  isAvailableInPlan: boolean;
};

function toFormValues({ loyalty }: UserOrganization): LoyaltySettingsInput {
  return {
    isEnabled: loyalty.isEnabled,
    stampsRequired: loyalty.stampsRequired,
    minimumPurchase: loyalty.minimumPurchase || undefined,
    rewardDescription: loyalty.rewardDescription,
  };
}

export function LoyaltySettingsForm({
  organization,
  isAvailableInPlan,
}: LoyaltySettingsFormProps) {
  const router = useRouter();
  const saveSettingsMutation = useSaveLoyaltySettingsMutation(organization.id);
  const form = useForm<LoyaltySettingsInput>({
    resolver: zodResolver(loyaltySettingsSchema),
    defaultValues: toFormValues(organization),
  });
  const isEnabled = useWatch({ control: form.control, name: "isEnabled" });

  const handleSubmit = form.handleSubmit((values) =>
    saveSettingsMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Fidelidade salva.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!isAvailableInPlan) {
    return (
      <section className="flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold text-lg">Fidelidade</h2>
        <p className="text-muted-foreground text-sm">
          O programa de fidelidade está disponível nos planos Gestão e Equipe.
          Troque de plano na aba Assinatura para usar.
        </p>
      </section>
    );
  }

  return (
    <SettingsFormSection
      title="Fidelidade"
      description="O cliente informa o celular ao pagar e ganha um selo por dia em que compra. Ao juntar os selos, ganha o prêmio."
      isDirty={form.formState.isDirty}
      isSubmitting={saveSettingsMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SwitchField
          control={form.control}
          name="isEnabled"
          label="Programa de fidelidade"
          description="Mostra o campo de celular na hora de cobrar, no PDV e nas comandas, e libera a página Fidelidade."
        />
        {isEnabled && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                control={form.control}
                name="stampsRequired"
                label="Selos para o prêmio"
                format="integer"
                placeholder="Ex.: 10"
              />
              <NumberField
                control={form.control}
                name="minimumPurchase"
                label="Compra mínima para ganhar selo"
                description="Deixe vazio para qualquer valor."
                format="currency"
                placeholder="Ex.: $ 20,00"
              />
            </div>
            <TextField
              control={form.control}
              name="rewardDescription"
              label="Prêmio"
              description="O que o cliente ganha ao juntar os selos. No resgate, entregue sem cobrar."
              placeholder="Ex.: 1 sobremesa grátis"
            />
          </>
        )}
      </FieldGroup>
    </SettingsFormSection>
  );
}
