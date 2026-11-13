"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import { useSetOrderTableMutation } from "@/features/orders/hooks/use-set-order-table-mutation";
import type { OrderDetails } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";

const changeTableSchema = z.object({
  tableNumber: z
    .number({ error: "Informe a mesa." })
    .int("Use um número inteiro.")
    .min(1, "Informe a mesa.")
    .max(999, "Mesa inválida."),
});

type ChangeTableInput = z.infer<typeof changeTableSchema>;

type ChangeTableDialogProps = {
  organizationId: OrganizationId;
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ChangeTableDialog({
  organizationId,
  order,
  isOpen,
  onClose,
}: ChangeTableDialogProps) {
  const setOrderTableMutation = useSetOrderTableMutation(organizationId);
  const form = useForm<ChangeTableInput>({
    resolver: zodResolver(changeTableSchema),
  });

  useEffect(() => {
    if (isOpen) form.reset({});
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit(({ tableNumber }) => {
    if (!order) return;
    setOrderTableMutation.mutate(
      { orderId: order.id, tableNumber },
      {
        onSuccess: () => {
          toast.success(`Conta movida para a mesa ${tableNumber}.`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Trocar mesa"
      description={
        order?.tableNumber
          ? `A conta está na mesa ${order.tableNumber}.`
          : undefined
      }
      submitLabel="Trocar"
      isSubmitting={setOrderTableMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="tableNumber"
          label="Nova mesa"
          format="integer"
          placeholder="Ex.: 7"
        />
      </FieldGroup>
    </FormDialog>
  );
}
