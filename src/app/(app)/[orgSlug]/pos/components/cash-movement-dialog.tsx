"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useAddCashMovementMutation } from "@/features/cash-register/hooks/use-add-cash-movement-mutation";
import {
  type CashMovementInput,
  cashMovementSchema,
} from "@/features/cash-register/schemas";
import type { CashMovementKind } from "@/features/cash-register/types";
import type { OrganizationId } from "@/features/organizations/types";

const MOVEMENT_TEXTS = {
  withdrawal: {
    title: "Sangria",
    description: "Retirada de dinheiro da gaveta, como depósito ou pagamento.",
    placeholder: "Ex.: Depósito no banco",
    success: "Sangria registrada.",
  },
  supply: {
    title: "Reforço",
    description: "Entrada de dinheiro na gaveta, como mais troco.",
    placeholder: "Ex.: Troco extra",
    success: "Reforço registrado.",
  },
} as const satisfies Record<
  CashMovementKind,
  { title: string; description: string; placeholder: string; success: string }
>;

const EMPTY_MOVEMENT_FORM: DefaultValues<CashMovementInput> = { note: "" };

type CashMovementDialogProps = {
  organizationId: OrganizationId;
  kind: CashMovementKind | null;
  onClose: () => void;
};

export function CashMovementDialog({
  organizationId,
  kind,
  onClose,
}: CashMovementDialogProps) {
  const movementMutation = useAddCashMovementMutation(organizationId);
  const form = useForm<CashMovementInput>({
    resolver: zodResolver(cashMovementSchema),
    defaultValues: EMPTY_MOVEMENT_FORM,
  });
  const texts = MOVEMENT_TEXTS[kind ?? "withdrawal"];

  useEffect(() => {
    if (kind) form.reset(EMPTY_MOVEMENT_FORM);
  }, [kind, form]);

  const handleSubmit = form.handleSubmit((input) => {
    if (!kind) return;
    movementMutation.mutate(
      { kind, input },
      {
        onSuccess: () => {
          toast.success(texts.success);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={kind !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={texts.title}
      description={texts.description}
      submitLabel="Registrar"
      isSubmitting={movementMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="amount"
          label="Valor"
          format="currency"
          placeholder="Ex.: $ 50,00"
        />
        <TextField
          control={form.control}
          name="note"
          label="Motivo (opcional)"
          placeholder={texts.placeholder}
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
