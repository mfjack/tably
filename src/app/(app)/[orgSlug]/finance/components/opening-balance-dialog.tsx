"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import { useOpeningBalanceQuery } from "@/features/finance/hooks/use-opening-balance-query";
import { useSaveOpeningBalanceMutation } from "@/features/finance/hooks/use-save-opening-balance-mutation";
import {
  type OpeningBalanceInput,
  openingBalanceSchema,
} from "@/features/finance/schemas";
import type { OrganizationId } from "@/features/organizations/types";

type OpeningBalanceDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

export function OpeningBalanceDialog({
  organizationId,
  isOpen,
  onClose,
}: OpeningBalanceDialogProps) {
  const openingBalanceQuery = useOpeningBalanceQuery(organizationId, isOpen);
  const saveMutation = useSaveOpeningBalanceMutation(organizationId);
  const form = useForm<OpeningBalanceInput>({
    resolver: zodResolver(openingBalanceSchema),
  });
  const openingBalance = openingBalanceQuery.data;

  useEffect(() => {
    if (!isOpen || openingBalance === undefined) return;
    form.reset({ openingBalance: openingBalance || undefined });
    saveMutation.reset();
  }, [isOpen, openingBalance, form, saveMutation.reset]);

  function closeDialog(isDialogOpen: boolean) {
    if (!isDialogOpen) onClose();
  }

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Saldo inicial salvo.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={closeDialog}
      title="Saldo inicial"
      description="Quanto você tinha em caixa quando começou a usar o financeiro. Ele entra no cálculo do saldo de hoje."
      submitLabel="Salvar"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
    >
      {openingBalance === undefined ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <FieldGroup>
          <NumberField
            control={form.control}
            name="openingBalance"
            label="Saldo inicial"
            format="currency"
            placeholder="Ex.: $ 1.500,00"
          />
        </FieldGroup>
      )}
    </FormDialog>
  );
}
