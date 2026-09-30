"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useFinanceAutomationSettingsQuery } from "@/features/finance/hooks/use-finance-automation-settings-query";
import { useSaveFinanceAutomationSettingsMutation } from "@/features/finance/hooks/use-save-finance-automation-settings-mutation";
import { AUTOMATED_PAYMENT_METHOD_LABELS } from "@/features/finance/labels";
import {
  type AutomationSettingsInput,
  automationSettingsSchema,
} from "@/features/finance/schemas";
import type {
  FinanceAutomationSettings,
  FinancialAccount,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

type AutomationDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  accounts: readonly FinancialAccount[];
  onClose: () => void;
};

function toFormValues(
  settings: FinanceAutomationSettings,
): DefaultValues<AutomationSettingsInput> {
  return {
    startDate: settings.startDate,
    isSalesEnabled: settings.isSalesEnabled,
    isCustomerPaymentsEnabled: settings.isCustomerPaymentsEnabled,
    isStockPurchasesEnabled: settings.isStockPurchasesEnabled,
    stockPurchaseAccountId: toSelectFieldValue(settings.stockPurchaseAccountId),
    isPayrollEnabled: settings.isPayrollEnabled,
    paymentMethods: settings.paymentMethods.map((method) => ({
      paymentMethod: method.paymentMethod,
      accountId: toSelectFieldValue(method.accountId),
      feePercent: method.feePercent || undefined,
      settlementDays: method.settlementDays || undefined,
    })),
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </h3>
  );
}

export function AutomationDialog({
  organizationId,
  isOpen,
  accounts,
  onClose,
}: AutomationDialogProps) {
  const settingsQuery = useFinanceAutomationSettingsQuery(
    organizationId,
    isOpen,
  );
  const saveMutation = useSaveFinanceAutomationSettingsMutation(organizationId);
  const form = useForm<AutomationSettingsInput>({
    resolver: zodResolver(automationSettingsSchema),
  });
  const [isSalesEnabled, isCustomerPaymentsEnabled, isStockPurchasesEnabled] =
    useWatch({
      control: form.control,
      name: [
        "isSalesEnabled",
        "isCustomerPaymentsEnabled",
        "isStockPurchasesEnabled",
      ],
    });
  const settings = settingsQuery.data;

  const accountOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Lançar como a receber" },
      ...accounts
        .filter((account) => !account.isArchived)
        .map((account) => ({ value: account.id, label: account.name })),
    ],
    [accounts],
  );

  const purchaseAccountOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Lançar como a pagar" },
      ...accounts
        .filter((account) => !account.isArchived)
        .map((account) => ({ value: account.id, label: account.name })),
    ],
    [accounts],
  );

  useEffect(() => {
    if (!isOpen || !settings) return;
    form.reset(toFormValues(settings));
    saveMutation.reset();
  }, [isOpen, settings, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Automação salva.", {
          description: "Os lançamentos são atualizados ao abrir o financeiro.",
        });
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const showsPaymentMethods = isSalesEnabled || isCustomerPaymentsEnabled;

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Lançamentos automáticos"
      description="O que o sistema lança sozinho no financeiro, a partir das vendas, do fiado, das compras e da folha."
      submitLabel="Salvar"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      {!settings ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <FieldGroup>
          <TextField
            control={form.control}
            name="startDate"
            label="Lançar a partir de"
            description="Movimentos antes dessa data não entram no financeiro."
            type="date"
          />

          <SectionTitle>Vendas e recebimentos</SectionTitle>
          <SwitchField
            control={form.control}
            name="isSalesEnabled"
            label="Vendas do PDV e das comandas"
            description="Uma receita por dia e forma de pagamento. Vendas no fiado entram só quando o cliente paga."
          />
          <SwitchField
            control={form.control}
            name="isCustomerPaymentsEnabled"
            label="Pagamentos de fiado"
            description="Quando o cliente quita a conta, o valor entra como receita."
          />

          {showsPaymentMethods && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                Para cada forma de pagamento: em qual conta o dinheiro cai, a
                taxa cobrada e em quantos dias ele chega (0 = no mesmo dia, 1 =
                D+1, 30 = D+30).
              </p>
              {settings.paymentMethods.map((method, index) => (
                <div
                  key={method.paymentMethod}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <SelectField
                    control={form.control}
                    name={`paymentMethods.${index}.accountId`}
                    label={
                      AUTOMATED_PAYMENT_METHOD_LABELS[method.paymentMethod]
                    }
                    options={accountOptions}
                  />
                  <NumberField
                    control={form.control}
                    name={`paymentMethods.${index}.feePercent`}
                    label="Taxa"
                    format="quantity"
                    suffix="%"
                    placeholder="Ex.: 3,15"
                  />
                  <NumberField
                    control={form.control}
                    name={`paymentMethods.${index}.settlementDays`}
                    label="Recebe em"
                    format="integer"
                    suffix="dias"
                    placeholder="Ex.: 30"
                  />
                </div>
              ))}
            </div>
          )}

          <SectionTitle>Compras e folha</SectionTitle>
          <SwitchField
            control={form.control}
            name="isStockPurchasesEnabled"
            label="Compras de insumos"
            description="Cada entrada de insumo vira uma despesa. Deixe desligado se você lança os boletos dos fornecedores à mão, para não duplicar."
          />
          {isStockPurchasesEnabled && (
            <SelectField
              control={form.control}
              name="stockPurchaseAccountId"
              label="Compras saem de qual conta"
              options={purchaseAccountOptions}
            />
          )}
          <SwitchField
            control={form.control}
            name="isPayrollEnabled"
            label="Folha de pagamento"
            description="Holerites emitidos viram salários a pagar até o 5º dia útil, mais FGTS e INSS/IRRF retidos com vencimento no dia 20."
          />
        </FieldGroup>
      )}
    </FormDialog>
  );
}
