"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useAdjustLoyaltyStampsMutation } from "@/features/loyalty/hooks/use-adjust-loyalty-stamps-mutation";
import {
  type LoyaltyAdjustmentInput,
  loyaltyAdjustmentSchema,
} from "@/features/loyalty/schemas";
import type { LoyaltyCustomer } from "@/features/loyalty/types";
import type { OrganizationId } from "@/features/organizations/types";

const EMPTY_ADJUSTMENT_FORM: DefaultValues<LoyaltyAdjustmentInput> = {
  stamps: undefined,
  note: "",
};

type LoyaltyAdjustmentDialogProps = {
  organizationId: OrganizationId;
  customer: LoyaltyCustomer | null;
  onClose: () => void;
};

export function LoyaltyAdjustmentDialog({
  organizationId,
  customer,
  onClose,
}: LoyaltyAdjustmentDialogProps) {
  const adjustMutation = useAdjustLoyaltyStampsMutation(organizationId);
  const form = useForm<LoyaltyAdjustmentInput>({
    resolver: zodResolver(loyaltyAdjustmentSchema),
    defaultValues: EMPTY_ADJUSTMENT_FORM,
  });
  const isOpen = customer !== null;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(EMPTY_ADJUSTMENT_FORM);
    adjustMutation.reset();
  }, [isOpen, form, adjustMutation.reset]);

  function closeDialog(isDialogOpen: boolean) {
    if (!isDialogOpen) onClose();
  }

  const handleSubmit = form.handleSubmit((values) => {
    if (!customer) return;
    adjustMutation.mutate(
      { customerId: customer.id, input: values },
      {
        onSuccess: () => {
          toast.success("Selos ajustados.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={closeDialog}
      title={customer ? `Ajustar selos de ${customer.name}` : "Ajustar selos"}
      description={
        customer
          ? `Hoje: ${customer.balance} selos. Use número negativo para tirar, como -2.`
          : undefined
      }
      submitLabel="Ajustar"
      isSubmitting={adjustMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="stamps"
          label="Selos"
          format="integer"
          allowsNegative
          placeholder="Ex.: 2 ou -2"
        />
        <TextField
          control={form.control}
          name="note"
          label="Motivo"
          placeholder="Ex.: Selo esquecido na compra de ontem"
        />
      </FieldGroup>
    </FormDialog>
  );
}
