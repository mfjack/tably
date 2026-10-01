"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import { useOpenCashRegisterMutation } from "@/features/cash-register/hooks/use-open-cash-register-mutation";
import {
  type OpenCashSessionInput,
  openCashSessionSchema,
} from "@/features/cash-register/schemas";
import type { OrganizationId } from "@/features/organizations/types";

type OpenCashRegisterDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

export function OpenCashRegisterDialog({
  organizationId,
  isOpen,
  onClose,
}: OpenCashRegisterDialogProps) {
  const openMutation = useOpenCashRegisterMutation(organizationId);
  const form = useForm<OpenCashSessionInput>({
    resolver: zodResolver(openCashSessionSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (isOpen) form.reset({});
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((values) =>
    openMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Caixa aberto.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Abrir caixa"
      description="Informe quanto tem de troco na gaveta. As vendas só podem ser cobradas com o caixa aberto."
      submitLabel="Abrir caixa"
      isSubmitting={openMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="openingAmount"
          label="Troco inicial"
          description="Deixe vazio se a gaveta começar sem dinheiro."
          format="currency"
          placeholder="Ex.: $ 100,00"
        />
      </FieldGroup>
    </FormDialog>
  );
}
