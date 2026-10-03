"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { StepperField } from "@/components/form/stepper-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useAdjustLoyaltyStampsMutation } from "@/features/loyalty/hooks/use-adjust-loyalty-stamps-mutation";
import {
  createLoyaltyBalanceFormSchema,
  type LoyaltyBalanceFormInput,
} from "@/features/loyalty/schemas";
import type { LoyaltyCustomer, LoyaltyProgram } from "@/features/loyalty/types";
import type { OrganizationId } from "@/features/organizations/types";

type LoyaltyAdjustmentDialogProps = {
  organizationId: OrganizationId;
  program: LoyaltyProgram;
  customer: LoyaltyCustomer | null;
  onClose: () => void;
};

function formatStamps(stamps: number) {
  return `${stamps} ${stamps === 1 ? "selo" : "selos"}`;
}

function formatBalanceChange(change: number) {
  if (change > 0) return `Vai ganhar ${formatStamps(change)}.`;
  if (change < 0) return `Vai perder ${formatStamps(-change)}.`;
  return undefined;
}

export function LoyaltyAdjustmentDialog({
  organizationId,
  program,
  customer,
  onClose,
}: LoyaltyAdjustmentDialogProps) {
  const adjustMutation = useAdjustLoyaltyStampsMutation(organizationId);
  const currentBalance = customer?.balance ?? 0;
  const maxBalance = Math.max(program.stampsRequired, currentBalance);
  const formSchema = useMemo(
    () => createLoyaltyBalanceFormSchema(currentBalance),
    [currentBalance],
  );
  const form = useForm<LoyaltyBalanceFormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { balance: currentBalance, note: "" },
  });
  const balance =
    useWatch({ control: form.control, name: "balance" }) ?? currentBalance;
  const isOpen = customer !== null;

  useEffect(() => {
    if (!isOpen) return;
    form.reset({ balance: currentBalance, note: "" });
    adjustMutation.reset();
  }, [isOpen, currentBalance, form, adjustMutation.reset]);

  function closeDialog(isDialogOpen: boolean) {
    if (!isDialogOpen) onClose();
  }

  const handleSubmit = form.handleSubmit((values) => {
    if (!customer) return;
    adjustMutation.mutate(
      {
        customerId: customer.id,
        input: { stamps: values.balance - currentBalance, note: values.note },
      },
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
      submitLabel="Ajustar"
      isSubmitting={adjustMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <StepperField
          control={form.control}
          name="balance"
          label="Selos"
          description={formatBalanceChange(balance - currentBalance)}
          min={0}
          max={maxBalance}
          formatValue={(value) => `${value} de ${program.stampsRequired}`}
          decreaseLabel="Tirar um selo"
          increaseLabel="Dar um selo"
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
