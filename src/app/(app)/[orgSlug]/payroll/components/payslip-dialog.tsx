"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileDown,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useAddManualPayslipItemMutation } from "@/features/payroll/hooks/use-add-manual-payslip-item-mutation";
import { useDeleteExtraPayslipMutation } from "@/features/payroll/hooks/use-delete-extra-payslip-mutation";
import { useGeneratePayslipMutation } from "@/features/payroll/hooks/use-generate-payslip-mutation";
import { useIssuePayslipMutation } from "@/features/payroll/hooks/use-issue-payslip-mutation";
import { useRemoveManualPayslipItemMutation } from "@/features/payroll/hooks/use-remove-manual-payslip-item-mutation";
import { useReopenPayslipMutation } from "@/features/payroll/hooks/use-reopen-payslip-mutation";
import {
  describePayslipPeriod,
  PAYSLIP_KIND_TITLES,
} from "@/features/payroll/payslip-labels";
import {
  type ManualPayslipItemInput,
  manualPayslipItemSchema,
} from "@/features/payroll/schemas";
import type { Payslip } from "@/features/payroll/types";
import {
  formatMinutes,
  formatSignedMinutes,
} from "@/features/time-clock/time-utils";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const MANUAL_ITEM_KIND_OPTIONS = [
  { value: "earning", label: "Provento" },
  { value: "deduction", label: "Desconto" },
] as const;

const EMPTY_MANUAL_ITEM: DefaultValues<ManualPayslipItemInput> = {
  description: "",
  kind: "earning",
  amount: undefined,
  isTaxable: true,
};

type PayslipDialogProps = {
  organizationId: OrganizationId;
  payslip: Payslip | null;
  business: OrderTicketBusiness;
  onClose: () => void;
};

export function PayslipDialog({
  organizationId,
  payslip,
  business,
  onClose,
}: PayslipDialogProps) {
  const generateMutation = useGeneratePayslipMutation(organizationId);
  const deleteExtraMutation = useDeleteExtraPayslipMutation(organizationId);
  const issueMutation = useIssuePayslipMutation(organizationId);
  const reopenMutation = useReopenPayslipMutation(organizationId);
  const addItemMutation = useAddManualPayslipItemMutation(organizationId);
  const removeItemMutation = useRemoveManualPayslipItemMutation(organizationId);
  const [isExporting, setIsExporting] = useState(false);
  const form = useForm<ManualPayslipItemInput>({
    resolver: zodResolver(manualPayslipItemSchema),
    defaultValues: EMPTY_MANUAL_ITEM,
  });
  const isIssued = payslip?.status === "issued";
  const manualItemIds = new Set(
    payslip?.manualItems.map((item) => `manual_${item.id}`),
  );

  useEffect(() => {
    if (payslip) form.reset(EMPTY_MANUAL_ITEM);
  }, [payslip, form]);

  const handleAddItem = form.handleSubmit((values) => {
    if (!payslip) return;
    addItemMutation.mutate(
      { payslip, input: values },
      {
        onSuccess: () => {
          toast.success("Lançamento adicionado.");
          form.reset(EMPTY_MANUAL_ITEM);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  function recalculate() {
    if (!payslip) return;
    generateMutation.mutate(
      { employeeId: payslip.employeeId, monthKey: payslip.monthKey },
      {
        onSuccess: () => toast.success("Holerite recalculado."),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function toggleIssued() {
    if (!payslip) return;
    const mutation = isIssued ? reopenMutation : issueMutation;
    mutation.mutate(payslip.id, {
      onSuccess: () =>
        toast.success(isIssued ? "Holerite reaberto." : "Holerite emitido."),
      onError: (error) => toast.error(error.message),
    });
  }

  async function downloadPdf() {
    if (!payslip) return;
    setIsExporting(true);
    try {
      const { exportPayslipPdf } = await import(
        "@/features/payroll/export-payslip-pdf"
      );
      await exportPayslipPdf(payslip, business);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  const isToggling = issueMutation.isPending || reopenMutation.isPending;
  const summary = payslip?.timesheetSummary;
  const isMonthly = payslip?.kind === "monthly";

  function deleteDraft() {
    if (!payslip) return;
    deleteExtraMutation.mutate(payslip.id, {
      onSuccess: () => {
        toast.success("Rascunho excluído.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen={payslip !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={
        payslip
          ? `${PAYSLIP_KIND_TITLES[payslip.kind]} · ${payslip.employee.name}`
          : "Holerite"
      }
      size="large"
      footer={
        <>
          <Button
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            isLoading={isExporting}
            onClick={downloadPdf}
          >
            <FileDown aria-hidden />
            PDF
          </Button>
          <Button
            variant={isIssued ? "outline" : "default"}
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            isLoading={isToggling}
            onClick={toggleIssued}
          >
            {isIssued ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
            {isIssued ? "Reabrir" : "Emitir"}
          </Button>
        </>
      }
    >
      {payslip && summary && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {describePayslipPeriod(payslip)}
              </span>
              <span className="text-muted-foreground text-xs">
                {payslip.employee.jobTitle} · salário{" "}
                {formatCurrency(payslip.employee.salary)}
              </span>
              {payslip.paymentDueDate && (
                <span className="text-muted-foreground text-xs">
                  Pagamento em {formatDateKey(payslip.paymentDueDate)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isIssued ? "default" : "secondary"}>
                {isIssued
                  ? `Emitido${payslip.issuedByName ? ` por ${payslip.issuedByName}` : ""}`
                  : "Rascunho"}
              </Badge>
              {!isIssued && !isMonthly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={deleteExtraMutation.isPending}
                  onClick={deleteDraft}
                >
                  <Trash2 aria-hidden />
                  Excluir
                </Button>
              )}
              {!isIssued && isMonthly && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={generateMutation.isPending}
                  onClick={recalculate}
                >
                  <RefreshCw
                    aria-hidden
                    className={cn(generateMutation.isPending && "animate-spin")}
                  />
                  Recalcular
                </Button>
              )}
            </div>
          </div>

          {isMonthly && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-muted/50 p-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Trabalhado</dt>
                <dd className="font-medium tabular-nums">
                  {formatMinutes(summary.workedMinutes)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Extras</dt>
                <dd className="font-medium tabular-nums">
                  {formatMinutes(
                    summary.overtimeMinutes + summary.restDayWorkedMinutes,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Faltas</dt>
                <dd className="font-medium tabular-nums">
                  {summary.absenceDays}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {payslip.employee.overtimePolicy === "hour_bank"
                    ? "Banco de horas"
                    : "Saldo"}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatSignedMinutes(
                    payslip.employee.overtimePolicy === "hour_bank"
                      ? payslip.hourBankBalanceMinutes
                      : summary.balanceMinutes,
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Descrição</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    Ref.
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Proventos
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Descontos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payslip.items.map((item) => (
                  <tr key={item.code}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        {item.description}
                        {!isIssued && manualItemIds.has(item.code) && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Remover ${item.description}`}
                            disabled={removeItemMutation.isPending}
                            onClick={() =>
                              removeItemMutation.mutate(
                                {
                                  payslip,
                                  manualItemId: item.code.replace(
                                    /^manual_/,
                                    "",
                                  ),
                                },
                                {
                                  onError: (error) =>
                                    toast.error(error.message),
                                },
                              )
                            }
                          >
                            <X aria-hidden />
                          </Button>
                        )}
                      </span>
                      {item.reference && (
                        <span className="text-muted-foreground text-xs sm:hidden">
                          {item.reference}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-muted-foreground tabular-nums sm:table-cell">
                      {item.reference}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {item.kind === "earning"
                        ? formatCurrency(item.amount)
                        : ""}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive tabular-nums">
                      {item.kind === "deduction"
                        ? formatCurrency(item.amount)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td className="px-3 py-2 font-medium">Totais</td>
                  <td className="hidden sm:table-cell" />
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatCurrency(payslip.grossAmount)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-destructive tabular-nums">
                    {formatCurrency(payslip.deductionAmount)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-3 font-semibold" colSpan={2}>
                    Líquido a receber
                  </td>
                  <td
                    className="px-3 py-3 text-right font-bold text-base tabular-nums"
                    colSpan={2}
                  >
                    {formatCurrency(payslip.netAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-muted-foreground text-xs">
            FGTS do mês (pago pela empresa):{" "}
            {formatCurrency(payslip.fgtsAmount)} · Base INSS{" "}
            {formatCurrency(payslip.inssBase)} · Base IRRF{" "}
            {formatCurrency(payslip.irrfBase)}
          </p>

          {!isIssued && isMonthly && (
            <form
              onSubmit={handleAddItem}
              noValidate
              className="flex flex-col gap-3 rounded-xl border p-3"
            >
              <p className="font-medium text-sm">
                Lançamento avulso (bônus, comissão, adiantamento…)
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                <TextField
                  control={form.control}
                  name="description"
                  label="Descrição"
                  placeholder="Ex.: Adiantamento dia 20"
                  autoComplete="off"
                />
                <SelectField
                  control={form.control}
                  name="kind"
                  label="Tipo"
                  options={MANUAL_ITEM_KIND_OPTIONS}
                />
                <NumberField
                  control={form.control}
                  name="amount"
                  label="Valor"
                  format="currency"
                  placeholder="Ex.: $ 300,00"
                />
              </div>
              <SwitchField
                control={form.control}
                name="isTaxable"
                label="Incide INSS, IRRF e FGTS"
                description="Vale só para proventos. Bônus e comissão têm incidência; ajuda de custo não."
              />
              <Button
                type="submit"
                variant="outline"
                className="self-end"
                isLoading={addItemMutation.isPending}
              >
                <Plus aria-hidden />
                Adicionar
              </Button>
            </form>
          )}
        </div>
      )}
    </DetailsDialog>
  );
}
