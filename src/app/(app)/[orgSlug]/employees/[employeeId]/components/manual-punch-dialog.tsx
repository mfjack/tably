"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useAddManualPunchMutation } from "@/features/time-clock/hooks/use-add-manual-punch-mutation";
import {
  type ManualPunchInput,
  manualPunchSchema,
} from "@/features/time-clock/schemas";

type ManualPunchDialogProps = {
  organizationId: OrganizationId;
  employeeId: EmployeeId;
  initialDate: string | null;
  onClose: () => void;
};

export function ManualPunchDialog({
  organizationId,
  employeeId,
  initialDate,
  onClose,
}: ManualPunchDialogProps) {
  const addMutation = useAddManualPunchMutation(organizationId);
  const form = useForm<ManualPunchInput>({
    resolver: zodResolver(manualPunchSchema),
    defaultValues: { workDate: "", time: "", isNextDay: false, reason: "" },
  });

  useEffect(() => {
    if (initialDate === null) return;
    form.reset({
      workDate: initialDate,
      time: "",
      isNextDay: false,
      reason: "",
    });
    addMutation.reset();
  }, [initialDate, form, addMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    addMutation.mutate(
      { employeeId, input: values },
      {
        onSuccess: () => {
          toast.success("Marcação incluída.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={initialDate !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Incluir marcação"
      description="Use quando o funcionário esqueceu de bater o ponto. A inclusão fica registrada com motivo, data e responsável, e aparece no espelho."
      submitLabel="Incluir"
      isSubmitting={addMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="workDate"
            label="Dia de trabalho"
            type="date"
          />
          <TextField
            control={form.control}
            name="time"
            label="Horário"
            type="time"
          />
        </div>
        <SwitchField
          control={form.control}
          name="isNextDay"
          label="Horário no dia seguinte"
          description="Para turnos que passam da meia-noite."
        />
        <TextareaField
          control={form.control}
          name="reason"
          label="Motivo"
          placeholder="Ex.: Esqueceu de marcar a volta do almoço, confirmado pelo gerente"
        />
      </FieldGroup>
    </FormDialog>
  );
}
