"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { MaskedField } from "@/components/form/masked-field";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateOrganizationSettingsMutation } from "@/features/organizations/hooks/use-update-organization-settings-mutation";
import {
  type OrganizationSettingsInput,
  organizationSettingsSchema,
} from "@/features/organizations/schemas";
import type { UserOrganization } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type OrganizationSettingsFormProps = {
  organization: UserOrganization;
};

function toFormValues(
  organization: UserOrganization,
): OrganizationSettingsInput {
  return {
    name: organization.name,
    taxId: organization.taxId ?? "",
    phone: organization.phone ?? "",
    address: organization.address ?? "",
    isTakeawayEnabled: organization.isTakeawayEnabled,
    takeawayFee: organization.takeawayFee,
  };
}

export function OrganizationSettingsForm({
  organization,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const updateSettingsMutation = useUpdateOrganizationSettingsMutation(
    organization.id,
  );
  const form = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: toFormValues(organization),
  });
  const isTakeawayEnabled = useWatch({
    control: form.control,
    name: "isTakeawayEnabled",
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
      title="Estabelecimento"
      description="Nome, CNPJ, telefone e endereço aparecem no cabeçalho dos cupons impressos."
      isDirty={form.formState.isDirty}
      isSubmitting={updateSettingsMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome do estabelecimento"
          placeholder="Ex.: Café da Esquina"
          autoComplete="organization"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <MaskedField
            control={form.control}
            name="taxId"
            label="CNPJ"
            mask="cnpj"
            placeholder="00.000.000/0000-00"
            autoComplete="off"
          />
          <MaskedField
            control={form.control}
            name="phone"
            label="Telefone"
            mask="phone"
            placeholder="00 00000-0000"
            autoComplete="tel-national"
          />
        </div>
        <TextareaField
          control={form.control}
          name="address"
          label="Endereço"
          placeholder="Rua, número, bairro, cidade - UF"
          autoComplete="street-address"
        />
        <SwitchField
          control={form.control}
          name="isTakeawayEnabled"
          label="Pedidos para levar"
          description="Mostra a opção Para levar ao informar o cliente no PDV."
        />
        {isTakeawayEnabled && (
          <NumberField
            control={form.control}
            name="takeawayFee"
            label="Taxa para levar"
            description="Somada ao pedido para levar. Deixe vazio para não cobrar."
            format="currency"
            placeholder="Ex.: $ 2,00"
          />
        )}
      </FieldGroup>
    </SettingsFormSection>
  );
}
