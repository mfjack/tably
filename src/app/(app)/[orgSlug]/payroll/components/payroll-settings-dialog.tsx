"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { usePayrollSettingsQuery } from "@/features/payroll/hooks/use-payroll-settings-query";
import { useSavePayrollSettingsMutation } from "@/features/payroll/hooks/use-save-payroll-settings-mutation";
import {
  type PayrollSettingsInput,
  payrollSettingsSchema,
  toPayrollSettingsInput,
} from "@/features/payroll/schemas";
import type { SalaryPaymentRule } from "@/features/payroll/types";

type PayrollSettingsDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

const SALARY_PAYMENT_RULE_OPTIONS = [
  {
    value: "fifth_business_day",
    label: "Quinto dia útil do mês seguinte",
  },
  { value: "last_day", label: "Último dia do mês trabalhado" },
  { value: "fixed_day", label: "Dia fixo" },
] as const satisfies readonly {
  value: SalaryPaymentRule;
  label: string;
}[];

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </h3>
  );
}

export function PayrollSettingsDialog({
  organizationId,
  isOpen,
  onClose,
}: PayrollSettingsDialogProps) {
  const settingsQuery = usePayrollSettingsQuery(organizationId);
  const saveMutation = useSavePayrollSettingsMutation(organizationId);
  const form = useForm<PayrollSettingsInput>({
    resolver: zodResolver(payrollSettingsSchema),
  });
  const salaryPaymentRule = useWatch({
    control: form.control,
    name: "salaryPaymentRule",
  });
  const inssBrackets = useFieldArray({
    control: form.control,
    name: "inssBrackets",
  });
  const irrfBrackets = useFieldArray({
    control: form.control,
    name: "irrfBrackets",
  });

  useEffect(() => {
    if (!isOpen || !settingsQuery.data) return;
    form.reset(toPayrollSettingsInput(settingsQuery.data));
    saveMutation.reset();
  }, [isOpen, settingsQuery.data, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Tabelas salvas. Recalcule os holerites em rascunho.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Tabelas e percentuais"
      description="Valores usados no cálculo dos holerites. As tabelas de INSS e IRRF mudam todo ano."
      submitLabel="Salvar"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      {!settingsQuery.data ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <FieldGroup>
          <Alert>
            <AlertDescription>
              Os valores iniciais seguem as tabelas de 2026 publicadas pelo
              governo. Confira com seu contador e atualize sempre que mudarem.
            </AlertDescription>
          </Alert>

          <SectionTitle>Pagamento do salário</SectionTitle>
          <SelectField
            control={form.control}
            name="salaryPaymentRule"
            label="Quando o salário é pago"
            options={SALARY_PAYMENT_RULE_OPTIONS}
            description="A data vai para o holerite e para a conta a pagar no Financeiro."
          />
          {salaryPaymentRule === "fixed_day" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                control={form.control}
                name="salaryPaymentDay"
                label="Dia"
                format="integer"
                placeholder="Ex.: 5"
              />
              <SwitchField
                control={form.control}
                name="isSalaryPaidNextMonth"
                label="No mês seguinte"
                description="Ex.: salário de setembro pago em outubro."
              />
            </div>
          )}

          <SectionTitle>INSS (progressivo)</SectionTitle>
          <div className="flex flex-col gap-3">
            {inssBrackets.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
              >
                <NumberField
                  control={form.control}
                  name={`inssBrackets.${index}.upTo`}
                  label={`Faixa ${index + 1}: até`}
                  format="currency"
                  size="compact"
                />
                <NumberField
                  control={form.control}
                  name={`inssBrackets.${index}.ratePercent`}
                  label="Alíquota"
                  format="quantity"
                  suffix="%"
                  size="compact"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover faixa ${index + 1} do INSS`}
                  className="text-destructive"
                  disabled={inssBrackets.fields.length === 1}
                  onClick={() => inssBrackets.remove(index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                inssBrackets.append({
                  upTo: Number.NaN,
                  ratePercent: Number.NaN,
                })
              }
            >
              <Plus aria-hidden />
              Faixa do INSS
            </Button>
          </div>

          <SectionTitle>IRRF (mensal)</SectionTitle>
          <div className="flex flex-col gap-3">
            {irrfBrackets.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3"
              >
                <NumberField
                  control={form.control}
                  name={`irrfBrackets.${index}.upTo`}
                  label={`Faixa ${index + 1}: até`}
                  format="currency"
                  placeholder="Sem limite"
                  size="compact"
                />
                <NumberField
                  control={form.control}
                  name={`irrfBrackets.${index}.ratePercent`}
                  label="Alíquota"
                  format="quantity"
                  suffix="%"
                  size="compact"
                />
                <NumberField
                  control={form.control}
                  name={`irrfBrackets.${index}.deduction`}
                  label="Dedução"
                  format="currency"
                  size="compact"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover faixa ${index + 1} do IRRF`}
                  className="text-destructive"
                  disabled={irrfBrackets.fields.length === 1}
                  onClick={() => irrfBrackets.remove(index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                irrfBrackets.append({
                  upTo: undefined,
                  ratePercent: Number.NaN,
                  deduction: Number.NaN,
                })
              }
            >
              <Plus aria-hidden />
              Faixa do IRRF
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="irrfDependentDeduction"
              label="Dedução por dependente"
              format="currency"
            />
            <NumberField
              control={form.control}
              name="irrfSimplifiedDeduction"
              label="Desconto simplificado"
              format="currency"
            />
          </div>

          <SectionTitle>Redução do IR (Lei 15.270/2025)</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="irrfExemptUpTo"
              label="Isento até"
              description="Renda tributável mensal sem IR."
              format="currency"
            />
            <NumberField
              control={form.control}
              name="irrfReductionUpTo"
              label="Redução parcial até"
              format="currency"
            />
            <NumberField
              control={form.control}
              name="irrfReductionConstant"
              label="Valor fixo da redução"
              format="currency"
            />
            <NumberField
              control={form.control}
              name="irrfReductionFactor"
              label="Fator sobre a renda"
              description="Redução = valor fixo − fator × renda."
              format="quantity"
            />
          </div>

          <SectionTitle>Percentuais</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="overtimePercent"
              label="Hora extra em dia útil"
              format="quantity"
              suffix="%"
            />
            <NumberField
              control={form.control}
              name="restDayOvertimePercent"
              label="Hora extra em descanso e feriado"
              format="quantity"
              suffix="%"
            />
            <NumberField
              control={form.control}
              name="nightShiftPercent"
              label="Adicional noturno"
              format="quantity"
              suffix="%"
            />
            <NumberField
              control={form.control}
              name="transportVoucherPercent"
              label="Desconto do vale-transporte"
              format="quantity"
              suffix="%"
            />
          </div>
        </FieldGroup>
      )}
    </FormDialog>
  );
}
