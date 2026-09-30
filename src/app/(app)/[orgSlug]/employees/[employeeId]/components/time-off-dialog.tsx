"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSaveTimeOffMutation } from "@/features/time-clock/hooks/use-save-time-off-mutation";
import { TIME_OFF_KIND_LABELS } from "@/features/time-clock/labels";
import {
  type TimeOffInput,
  timeOffSchema,
} from "@/features/time-clock/schemas";

const TIME_OFF_KIND_OPTIONS = Object.entries(TIME_OFF_KIND_LABELS).map(
  ([value, label]) => ({ value, label }),
);

type TimeOffDialogProps = {
  organizationId: OrganizationId;
  employeeId: EmployeeId;
  initialDate: string | null;
  onClose: () => void;
};

export function TimeOffDialog({
  organizationId,
  employeeId,
  initialDate,
  onClose,
}: TimeOffDialogProps) {
  const saveMutation = useSaveTimeOffMutation(organizationId);
  const form = useForm<TimeOffInput>({
    resolver: zodResolver(timeOffSchema),
  });

  useEffect(() => {
    if (initialDate === null) return;
    const defaultValues: DefaultValues<TimeOffInput> = {
      kind: undefined,
      startDate: initialDate,
      endDate: initialDate,
      notes: "",
    };
    form.reset(defaultValues);
    saveMutation.reset();
  }, [initialDate, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { employeeId, input: values },
      {
        onSuccess: () => {
          toast.success("Ausência lançada.");
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
      title="Lançar ausência"
      description="Dias de atestado, férias, folga ou falta justificada não contam como falta nem descontam no holerite."
      submitLabel="Lançar"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SelectField
          control={form.control}
          name="kind"
          label="Tipo"
          options={TIME_OFF_KIND_OPTIONS}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="startDate"
            label="De"
            type="date"
          />
          <TextField
            control={form.control}
            name="endDate"
            label="Até"
            type="date"
          />
        </div>
        <TextareaField
          control={form.control}
          name="notes"
          label="Observações"
          placeholder="Ex.: Atestado de 2 dias, CID guardado na pasta"
        />
      </FieldGroup>
    </FormDialog>
  );
}
