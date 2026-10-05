"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import {
  type DefaultValues,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { MaskedField } from "@/components/form/masked-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveEmployeeMutation } from "@/features/employees/hooks/use-save-employee-mutation";
import {
  EMPLOYMENT_TYPE_LABELS,
  OVERTIME_POLICY_LABELS,
} from "@/features/employees/labels";
import {
  type EmployeeInput,
  employeeSchema,
} from "@/features/employees/schemas";
import type {
  EmployeeWithAccess,
  WorkSchedule,
} from "@/features/employees/types";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";
import { PageAccessField } from "../../components/page-access-field";

const EMPLOYMENT_TYPE_OPTIONS = Object.entries(EMPLOYMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const OVERTIME_POLICY_OPTIONS = Object.entries(OVERTIME_POLICY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const EMPTY_EMPLOYEE_FORM: DefaultValues<EmployeeInput> = {
  name: "",
  cpf: "",
  pis: "",
  birthDate: "",
  phone: "",
  jobTitle: "",
  cbo: "",
  employmentType: "clt",
  admissionDate: "",
  effectiveDate: "",
  terminationDate: "",
  salary: undefined,
  workScheduleId: NONE_SELECT_VALUE,
  overtimePolicy: "paid",
  dependents: undefined,
  hasTransportVoucher: false,
  notes: "",
  hasSystemAccess: false,
  allowedModules: [],
  canAccessSettings: false,
};

type EmployeeFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  employee?: EmployeeWithAccess;
  workSchedules: readonly WorkSchedule[];
  visibleModuleIds: readonly AppModuleId[];
  onClose: () => void;
};

function toFormValues(
  employee: EmployeeWithAccess,
): DefaultValues<EmployeeInput> {
  return {
    name: employee.name,
    cpf: employee.cpf,
    pis: employee.pis ?? "",
    birthDate: employee.birthDate ?? "",
    phone: employee.phone ?? "",
    jobTitle: employee.jobTitle,
    cbo: employee.cbo ?? "",
    employmentType: employee.employmentType,
    admissionDate: employee.admissionDate,
    effectiveDate: employee.effectiveDate ?? "",
    terminationDate: employee.terminationDate ?? "",
    salary: employee.salary,
    workScheduleId: toSelectFieldValue(employee.workScheduleId),
    overtimePolicy: employee.overtimePolicy,
    dependents: employee.dependents,
    hasTransportVoucher: employee.hasTransportVoucher,
    notes: employee.notes ?? "",
    hasSystemAccess: employee.systemAccess !== null,
    allowedModules: employee.systemAccess?.allowedModules ?? [],
    canAccessSettings: employee.systemAccess?.canAccessSettings ?? false,
  };
}

function FormSectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </h3>
  );
}

export function EmployeeFormDialog({
  organizationId,
  isOpen,
  employee,
  workSchedules,
  visibleModuleIds,
  onClose,
}: EmployeeFormDialogProps) {
  const saveEmployeeMutation = useSaveEmployeeMutation(organizationId);
  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: EMPTY_EMPLOYEE_FORM,
  });
  const isEditing = employee !== undefined;
  const hasSystemAccess = useWatch({
    control: form.control,
    name: "hasSystemAccess",
  });
  const allowedModulesField = useController({
    control: form.control,
    name: "allowedModules",
  });
  const settingsField = useController({
    control: form.control,
    name: "canAccessSettings",
  });
  const scheduleOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Sem jornada definida" },
      ...workSchedules.map((schedule) => ({
        value: schedule.id,
        label: schedule.name,
      })),
    ],
    [workSchedules],
  );

  useEffect(() => {
    if (!isOpen) return;
    form.reset(employee ? toFormValues(employee) : EMPTY_EMPLOYEE_FORM);
    saveEmployeeMutation.reset();
  }, [isOpen, employee, form, saveEmployeeMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    saveEmployeeMutation.mutate(
      { employeeId: employee?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Funcionário atualizado." : "Funcionário cadastrado.",
          );
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
      title={isEditing ? "Editar funcionário" : "Novo funcionário"}
      description="Os dados do contrato são usados no espelho de ponto e no holerite."
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveEmployeeMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <FormSectionTitle>Dados pessoais</FormSectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Nome completo"
            placeholder="Ex.: Maria da Silva"
            autoComplete="off"
          />
          <MaskedField
            control={form.control}
            name="cpf"
            label="CPF"
            mask="cpf"
            placeholder="000.000.000-00"
            autoComplete="off"
          />
          <MaskedField
            control={form.control}
            name="pis"
            label="PIS/PASEP"
            mask="pis"
            placeholder="000.00000.00-0"
            autoComplete="off"
          />
          <DateField
            control={form.control}
            name="birthDate"
            label="Nascimento"
          />
          <MaskedField
            control={form.control}
            name="phone"
            label="Telefone"
            mask="phone"
            placeholder="00 00000-0000"
            autoComplete="off"
          />
        </div>

        <FormSectionTitle>Contrato</FormSectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="jobTitle"
            label="Cargo"
            placeholder="Ex.: Barista"
            autoComplete="off"
          />
          <MaskedField
            control={form.control}
            name="cbo"
            label="CBO"
            description="Código da ocupação usado no eSocial. Consulte em mtecbo.gov.br."
            mask="cbo"
            placeholder="0000-00"
            autoComplete="off"
          />
          <SelectField
            control={form.control}
            name="employmentType"
            label="Tipo de contrato"
            options={EMPLOYMENT_TYPE_OPTIONS}
          />
          <DateField
            control={form.control}
            name="admissionDate"
            label="Admissão"
          />
          <DateField
            control={form.control}
            name="effectiveDate"
            label="Efetivação"
            description="Fim da experiência. Deixe vazio se já é efetivo."
          />
          <NumberField
            control={form.control}
            name="salary"
            label="Salário mensal"
            format="currency"
            placeholder="Ex.: $ 1.800,00"
          />
          <DateField
            control={form.control}
            name="terminationDate"
            label="Desligamento"
            description="Preencha só quando o funcionário sair."
          />
        </div>

        <FormSectionTitle>Jornada e folha</FormSectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="workScheduleId"
            label="Jornada"
            options={scheduleOptions}
          />
          <SelectField
            control={form.control}
            name="overtimePolicy"
            label="Horas a mais ou a menos"
            options={OVERTIME_POLICY_OPTIONS}
          />
          <NumberField
            control={form.control}
            name="dependents"
            label="Dependentes para IR"
            format="integer"
            placeholder="Ex.: 1"
          />
        </div>
        <SwitchField
          control={form.control}
          name="hasTransportVoucher"
          label="Recebe vale-transporte"
          description="Desconta até 6% do salário no holerite."
        />
        <TextareaField
          control={form.control}
          name="notes"
          label="Observações"
          placeholder="Ex.: Trabalha em escala 6x1"
        />

        <FormSectionTitle>Acesso ao sistema</FormSectionTitle>
        <SwitchField
          control={form.control}
          name="hasSystemAccess"
          label="Pode usar o sistema"
          description="A pessoa entra com o mesmo PIN do ponto, que ela mesma cria no primeiro acesso."
        />
        {hasSystemAccess && (
          <PageAccessField
            allowedModules={allowedModulesField.field.value}
            canAccessSettings={settingsField.field.value}
            visibleModuleIds={visibleModuleIds}
            errorMessage={allowedModulesField.fieldState.error?.message}
            onAllowedModulesChange={allowedModulesField.field.onChange}
            onCanAccessSettingsChange={settingsField.field.onChange}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
