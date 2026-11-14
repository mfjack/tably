"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MaskedField } from "@/components/form/masked-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  type CancelPinInput,
  cancelPinSchema,
} from "@/features/orders/cancel-authorization";
import { useRemoveCancelPinMutation } from "@/features/organizations/hooks/use-remove-cancel-pin-mutation";
import { useSetCancelPinMutation } from "@/features/organizations/hooks/use-set-cancel-pin-mutation";
import type { OrganizationId } from "@/features/organizations/types";
import { SettingsFormSection } from "./settings-form-section";

type CancelPinFormProps = {
  organizationId: OrganizationId;
  isEnabled: boolean;
};

export function CancelPinForm({
  organizationId,
  isEnabled,
}: CancelPinFormProps) {
  const router = useRouter();
  const setPinMutation = useSetCancelPinMutation(organizationId);
  const removePinMutation = useRemoveCancelPinMutation(organizationId);
  const form = useForm<CancelPinInput>({
    resolver: zodResolver(cancelPinSchema),
    defaultValues: { pin: "" },
  });

  const handleSubmit = form.handleSubmit((values) =>
    setPinMutation.mutate(values, {
      onSuccess: () => {
        form.reset({ pin: "" });
        toast.success(isEnabled ? "PIN trocado." : "PIN criado.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function removePin() {
    removePinMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("PIN removido.");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <SettingsFormSection
      title="PIN para cancelar vendas"
      description={
        isEnabled
          ? "Ativo. Quem é da equipe precisa do PIN para cancelar ou reabrir uma venda paga. Você, como dono, não precisa."
          : "Com um PIN, quem é da equipe só cancela ou reabre uma venda paga se souber o número. Você, como dono, não precisa digitar."
      }
      isDirty={form.formState.isDirty}
      isSubmitting={setPinMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <MaskedField
          control={form.control}
          name="pin"
          label={isEnabled ? "Novo PIN" : "PIN"}
          description="4 números. Não use o mesmo PIN do ponto."
          mask="pin"
          isSecret
          placeholder="Ex.: 4821"
          autoComplete="off"
        />
        {isEnabled && (
          <div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              isLoading={removePinMutation.isPending}
              onClick={removePin}
            >
              Remover PIN
            </Button>
          </div>
        )}
      </FieldGroup>
    </SettingsFormSection>
  );
}
