"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateCardTerminalSettingsMutation } from "@/features/card-terminal/hooks/use-update-card-terminal-settings-mutation";
import {
  type CardTerminalSettingsInput,
  cardTerminalSettingsSchema,
} from "@/features/card-terminal/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type CardTerminalSettingsFormProps = {
  organization: UserOrganization;
};

function getDescription(isConnected: boolean): string {
  return isConnected
    ? "Conectada. No pagamento do PDV aparece o botão para cobrar direto na Cielo Smart."
    : "Com a Cielo Smart conectada, o PDV envia o valor para a maquininha e confirma a venda sozinho quando o cliente paga.";
}

export function CardTerminalSettingsForm({
  organization,
}: CardTerminalSettingsFormProps) {
  const router = useRouter();
  const updateMutation = useUpdateCardTerminalSettingsMutation(organization.id);
  const form = useForm<CardTerminalSettingsInput>({
    resolver: zodResolver(cardTerminalSettingsSchema),
    defaultValues: { cieloMerchantId: organization.cieloMerchantId ?? "" },
  });

  const handleSubmit = form.handleSubmit((values) =>
    updateMutation.mutate(values, {
      onSuccess: () => {
        form.reset(values);
        toast.success("Maquininha salva.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <SettingsFormSection
      title="Maquininha Cielo Smart"
      description={getDescription(organization.checkout.isCardTerminalEnabled)}
      isDirty={form.formState.isDirty}
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="cieloMerchantId"
          label="Merchant ID da Cielo"
          description="A Cielo envia esse código depois de liberar a integração pelo e-mail integracaosmart@cielo.com.br."
          placeholder="Ex.: 1234567890123456"
          autoComplete="off"
        />
      </FieldGroup>
    </SettingsFormSection>
  );
}
