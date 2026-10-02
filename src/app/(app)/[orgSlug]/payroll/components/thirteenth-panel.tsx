"use client";

import { Calculator, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useGenerateThirteenthMutation } from "@/features/payroll/hooks/use-generate-thirteenth-mutation";
import { useThirteenthYearQuery } from "@/features/payroll/hooks/use-thirteenth-year-query";
import type { ThirteenthInstallment } from "@/features/payroll/schemas";
import type { Payslip, PayslipId } from "@/features/payroll/types";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { formatCurrency } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";

const YEAR_PATTERN = /^d{4}$/;

function parseYear(rawValue: string) {
  return YEAR_PATTERN.test(rawValue) ? rawValue : null;
}

type ThirteenthPanelProps = {
  organizationId: OrganizationId;
  business: OrderTicketBusiness;
  initialYear: number;
};

type InstallmentCellProps = {
  payslip: Payslip | null;
  label: string;
  onOpen: (payslipId: PayslipId) => void;
};

function InstallmentCell({ payslip, label, onOpen }: InstallmentCellProps) {
  if (!payslip) {
    return (
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-muted-foreground text-sm">Não calculada</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="flex flex-col rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted"
      onClick={() => onOpen(payslip.id)}
    >
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-sm tabular-nums">
          {formatCurrency(payslip.netAmount)}
        </span>
        <Badge variant={payslip.status === "issued" ? "default" : "secondary"}>
          {payslip.status === "issued" ? "Emitido" : "Rascunho"}
        </Badge>
      </span>
    </button>
  );
}

export function ThirteenthPanel({
  organizationId,
  business,
  initialYear,
}: ThirteenthPanelProps) {
  const [yearParam, setYearParam] = useSearchParamState({
    key: "year",
    defaultValue: String(initialYear),
    parse: parseYear,
  });
  const year = Number(yearParam);
  const yearQuery = useThirteenthYearQuery(organizationId, year);
  const generateMutation = useGenerateThirteenthMutation(organizationId);
  const [selectedPayslipId, setSelectedPayslipId] = useState<PayslipId | null>(
    null,
  );
  const rows = yearQuery.data?.rows;
  const selectedPayslip =
    rows
      ?.flatMap((row) => [row.first, row.second])
      .find((payslip) => payslip?.id === selectedPayslipId) ?? null;

  function shiftYear(offset: number) {
    setYearParam((currentYear) => String(Number(currentYear) + offset));
  }

  function showPreviousYear() {
    shiftYear(-1);
  }

  function showNextYear() {
    shiftYear(1);
  }

  function generate(installment: ThirteenthInstallment) {
    generateMutation.mutate(
      { year, installment },
      {
        onSuccess: ({ generatedCount }) =>
          toast.success(
            generatedCount === 0
              ? "Nada para calcular: essa parcela já foi emitida para todos."
              : `${generatedCount} ${generatedCount === 1 ? "cálculo feito" : "cálculos feitos"}. Confira e emita.`,
          ),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border px-1 py-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ano anterior"
            onClick={showPreviousYear}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-16 text-center font-semibold text-sm tabular-nums">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo ano"
            onClick={showNextYear}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["first", "second"] as const).map((installment) => {
            const isPending =
              generateMutation.isPending &&
              generateMutation.variables?.installment === installment;
            return (
              <Button
                key={installment}
                variant={installment === "first" ? "outline" : "default"}
                className="h-10"
                disabled={generateMutation.isPending || !rows?.length}
                aria-busy={isPending}
                onClick={() => generate(installment)}
              >
                {isPending ? (
                  <Spinner aria-hidden />
                ) : (
                  <Calculator aria-hidden />
                )}
                Calcular {installment === "first" ? "1ª" : "2ª"} parcela
              </Button>
            );
          })}
        </div>
      </div>

      <Alert>
        <AlertDescription>
          1ª parcela: metade do 13º, sem descontos, paga até 30/11. 2ª parcela:
          o restante com INSS e IRRF, paga até 20/12. Conta 1/12 por mês com 15
          dias ou mais trabalhados, e inclui a média de horas extras e adicional
          noturno do ano.
        </AlertDescription>
      </Alert>

      {yearQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{yearQuery.error.message}</AlertDescription>
        </Alert>
      ) : !rows ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
          Nenhum funcionário CLT trabalhou em {year}.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {rows.map((row) => (
            <li
              key={row.employeeId}
              className="grid grid-cols-2 items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_6rem_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className="col-span-2 flex min-w-0 flex-col md:col-span-1">
                <span className="truncate font-medium">{row.name}</span>
                <span className="truncate text-muted-foreground text-xs">
                  {row.jobTitle}
                </span>
              </div>
              <span className="col-span-2 text-muted-foreground text-sm tabular-nums md:col-span-1">
                {row.months}/12 avos
              </span>
              <InstallmentCell
                payslip={row.first}
                label="1ª parcela"
                onOpen={setSelectedPayslipId}
              />
              <InstallmentCell
                payslip={row.second}
                label="2ª parcela"
                onOpen={setSelectedPayslipId}
              />
            </li>
          ))}
        </ul>
      )}

      <PayslipDialog
        organizationId={organizationId}
        payslip={selectedPayslip}
        business={business}
        onClose={() => setSelectedPayslipId(null)}
      />
    </div>
  );
}
