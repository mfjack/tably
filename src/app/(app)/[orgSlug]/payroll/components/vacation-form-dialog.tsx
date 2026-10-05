"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useCreateVacationMutation } from "@/features/payroll/hooks/use-create-vacation-mutation";
import {
  SOLD_VACATION_DAYS,
  type VacationInput,
  vacationSchema,
} from "@/features/payroll/schemas";
import type { VacationEmployee } from "@/features/payroll/types";
import { formatDateKey } from "@/lib/format";

const EMPTY_VACATION_FORM: DefaultValues<VacationInput> = {
  employeeId: undefined,
  startDate: "",
  days: undefined,
  sellsDays: false,
};

type VacationFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  employees: readonly VacationEmployee[];
  onClose: () => void;
};

function describeEntitlement(employee: VacationEmployee): string {
  if (employee.entitlement.status === "accruing") {
    return `Ainda sem direito. Passa a ter a partir de ${formatDateKey(employee.entitlement.entitledFrom)}.`;
  }
  const period = employee.entitlement.periods[0];
  if (!period) return "Sem saldo de férias no momento.";
  return `${period.daysAvailable} dias disponíveis (período ${formatDateKey(period.start)} a ${formatDateKey(period.end)}). Tirar até ${formatDateKey(period.concessionDeadline)}.`;
}

export function VacationFormDialog({
  organizationId,
  isOpen,
  employees,
  onClose,
}: VacationFormDialogProps) {
  const createMutation = useCreateVacationMutation(organizationId);
  const form = useForm<VacationInput>({
    resolver: zodResolver(vacationSchema),
    defaultValues: EMPTY_VACATION_FORM,
  });
  const employeeId = useWatch({ control: form.control, name: "employeeId" });
  const selectedEmployee = employees.find(
    (employee) => employee.employeeId === employeeId,
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.employeeId,
        label: employee.name,
      })),
    [employees],
  );

  useEffect(() => {
    if (!isOpen) return;
    form.reset(EMPTY_VACATION_FORM);
    createMutation.reset();
  }, [isOpen, form, createMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Férias programadas.", {
          description:
            "O recibo ficou em rascunho. Confira e emita; o pagamento vence 2 dias antes do início.",
        });
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Programar férias"
      description="Calcula o recibo de férias e marca os dias como férias no espelho de ponto."
      submitLabel="Programar"
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SelectField
          control={form.control}
          name="employeeId"
          label="Funcionário"
          options={employeeOptions}
        />
        {selectedEmployee && (
          <p className="-mt-3 text-muted-foreground text-xs">
            {describeEntitlement(selectedEmployee)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <DateField
            control={form.control}
            name="startDate"
            label="Primeiro dia"
          />
          <NumberField
            control={form.control}
            name="days"
            label="Dias de descanso"
            format="integer"
            placeholder="Ex.: 30"
          />
        </div>
        <SwitchField
          control={form.control}
          name="sellsDays"
          label={`Vender ${SOLD_VACATION_DAYS} dias (abono pecuniário)`}
          description="O funcionário trabalha 10 dias e recebe por eles com 1/3, sem INSS e IR."
        />
        <p className="text-muted-foreground text-xs">
          Avise o funcionário por escrito com 30 dias de antecedência. As férias
          não podem começar nos 2 dias antes de feriado ou folga.
        </p>
      </FieldGroup>
    </FormDialog>
  );
}
