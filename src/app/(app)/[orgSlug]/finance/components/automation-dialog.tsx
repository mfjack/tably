"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
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
import type { FinanceAutomationSettings } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";

type AutomationDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  onClose: () => void;
};

function toFormValues(
  settings: FinanceAutomationSettings,
): DefaultValues<AutomationSettingsInput> {
  return {
    startDate: settings.startDate,
    openingBalance: settings.openingBalance || undefined,
    isSalesEnabled: settings.isSalesEnabled,
    isCustomerPaymentsEnabled: settings.isCustomerPaymentsEnabled,
    isStockPurchasesEnabled: settings.isStockPurchasesEnabled,
    isPayrollEnabled: settings.isPayrollEnabled,
    paymentMethods: settings.paymentMethods.map((method) => ({
      paymentMethod: method.paymentMethod,
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
  const [isSalesEnabled, isCustomerPaymentsEnabled] = useWatch({
    control: form.control,
    name: ["isSalesEnabled", "isCustomerPaymentsEnabled"],
  });
  const settings = settingsQuery.data;

  useEffect(() => {
    if (!isOpen || !settings) return;
    form.reset(toFormValues(settings));
    saveMutation.reset();
  }, [isOpen, settings, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Configurações salvas.");
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
      title="Configurações do financeiro"
      description="Saldo inicial e o que o sistema lança sozinho a partir das vendas, do fiado, das compras e da folha."
      submitLabel="Salvar"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      {!settings ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="openingBalance"
              label="Saldo inicial"
              description="Quanto você tinha quando começou a usar o financeiro."
              format="currency"
              placeholder="Ex.: $ 1.500,00"
            />
            <TextField
              control={form.control}
              name="startDate"
              label="Lançar vendas a partir de"
              description="Movimentos antes dessa data não entram."
              type="date"
            />
          </div>

          <SectionTitle>Vendas</SectionTitle>
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
                Taxa da maquininha e em quantos dias o dinheiro chega (0 = no
                mesmo dia, 1 = D+1, 30 = D+30).
              </p>
              {settings.paymentMethods.map((method, index) => (
                <div
                  key={method.paymentMethod}
                  className="grid grid-cols-2 items-end gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]"
                >
                  <p className="col-span-2 font-medium text-sm sm:col-span-1 sm:pb-3.5">
                    {AUTOMATED_PAYMENT_METHOD_LABELS[method.paymentMethod]}
                  </p>
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
            description="Cada entrada de insumo vira uma despesa paga. Deixe desligado se você lança os boletos dos fornecedores à mão, para não duplicar."
          />
          <SwitchField
            control={form.control}
            name="isPayrollEnabled"
            label="Folha de pagamento"
            description="Holerites emitidos viram salários a pagar até o 5º dia útil, mais FGTS e INSS/IRRF retidos no dia 20."
          />
        </FieldGroup>
      )}
    </FormDialog>
  );
}
