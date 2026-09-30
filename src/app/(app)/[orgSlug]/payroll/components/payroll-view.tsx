"use client";

import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmployeeId } from "@/features/employees/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useGenerateAllPayslipsMutation } from "@/features/payroll/hooks/use-generate-all-payslips-mutation";
import { useGeneratePayslipMutation } from "@/features/payroll/hooks/use-generate-payslip-mutation";
import { usePayrollMonthQuery } from "@/features/payroll/hooks/use-payroll-month-query";
import type { PayrollRow } from "@/features/payroll/types";
import {
  formatMonthLabel,
  shiftMonthKey,
} from "@/features/time-clock/time-utils";
import { formatCurrency } from "@/lib/format";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { PayrollSettingsDialog } from "./payroll-settings-dialog";
import { PayslipDialog } from "./payslip-dialog";
import { ThirteenthPanel } from "./thirteenth-panel";
import { VacationsPanel } from "./vacations-panel";

const PAYROLL_TABS = ["monthly", "vacations", "thirteenth"] as const;

type PayrollTab = (typeof PAYROLL_TABS)[number];

type PayrollViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  business: OrderTicketBusiness;
  initialMonthKey: string;
  employeesHref: string;
};

function getRowStatus(row: PayrollRow) {
  if (!row.payslip)
    return { label: "Não calculado", variant: "outline" } as const;
  if (row.payslip.status === "issued") {
    return { label: "Emitido", variant: "default" } as const;
  }
  return { label: "Rascunho", variant: "secondary" } as const;
}

export function PayrollView({
  organizationId,
  title,
  description,
  business,
  initialMonthKey,
  employeesHref,
}: PayrollViewProps) {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [tab, setTab] = useState<PayrollTab>("monthly");
  const payrollQuery = usePayrollMonthQuery(organizationId, monthKey);
  const generateAllMutation = useGenerateAllPayslipsMutation(organizationId);
  const generateMutation = useGeneratePayslipMutation(organizationId);
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<EmployeeId | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const rows = payrollQuery.data?.rows;
  const selectedPayslip =
    rows?.find((row) => row.employeeId === selectedEmployeeId)?.payslip ?? null;

  const totals = useMemo(
    () =>
      (rows ?? []).reduce(
        (total, row) => ({
          gross: total.gross + (row.payslip?.grossAmount ?? 0),
          net: total.net + (row.payslip?.netAmount ?? 0),
          fgts: total.fgts + (row.payslip?.fgtsAmount ?? 0),
        }),
        { gross: 0, net: 0, fgts: 0 },
      ),
    [rows],
  );

  function generateAll() {
    generateAllMutation.mutate(monthKey, {
      onSuccess: ({ generatedCount }) =>
        toast.success(
          generatedCount === 0
            ? "Todos os holerites do mês já foram emitidos."
            : `${generatedCount} ${generatedCount === 1 ? "holerite calculado" : "holerites calculados"}.`,
        ),
      onError: (error) => toast.error(error.message),
    });
  }

  function openRow(row: PayrollRow) {
    if (row.payslip) {
      setSelectedEmployeeId(row.employeeId);
      return;
    }
    generateMutation.mutate(
      { employeeId: row.employeeId, monthKey },
      {
        onSuccess: () => setSelectedEmployeeId(row.employeeId),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 aria-hidden />
              <span className="max-sm:sr-only">Tabelas</span>
            </Button>
            {tab === "monthly" && (
              <Button
                className="h-10"
                disabled={generateAllMutation.isPending || !rows?.length}
                aria-busy={generateAllMutation.isPending}
                onClick={generateAll}
              >
                {generateAllMutation.isPending ? (
                  <Spinner aria-hidden />
                ) : (
                  <Calculator aria-hidden />
                )}
                <span className="max-sm:sr-only">Calcular folha</span>
              </Button>
            )}
          </>
        }
      />
      <PageContent>
        <Tabs
          value={tab}
          onValueChange={(value: string) => {
            const nextTab = PAYROLL_TABS.find(
              (payrollTab) => payrollTab === value,
            );
            if (nextTab) setTab(nextTab);
          }}
          className="gap-5"
        >
          <TabsList className="group-data-horizontal/tabs:h-10">
            <TabsTrigger value="monthly" className="px-3">
              Mensal
            </TabsTrigger>
            <TabsTrigger value="vacations" className="px-3">
              Férias
            </TabsTrigger>
            <TabsTrigger value="thirteenth" className="px-3">
              13º salário
            </TabsTrigger>
          </TabsList>
          <TabsContent value="vacations">
            <VacationsPanel
              organizationId={organizationId}
              business={business}
            />
          </TabsContent>
          <TabsContent value="thirteenth">
            <ThirteenthPanel
              organizationId={organizationId}
              business={business}
              initialYear={Number(initialMonthKey.slice(0, 4))}
            />
          </TabsContent>
          <TabsContent value="monthly">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-lg border px-1 py-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mês anterior"
                    onClick={() =>
                      setMonthKey((current) => shiftMonthKey(current, -1))
                    }
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <span className="min-w-36 text-center font-semibold text-sm">
                    {formatMonthLabel(monthKey)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Próximo mês"
                    onClick={() =>
                      setMonthKey((current) => shiftMonthKey(current, 1))
                    }
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                {rows && rows.length > 0 && (
                  <p className="text-muted-foreground text-sm tabular-nums">
                    Líquido{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(totals.net)}
                    </span>{" "}
                    · Bruto {formatCurrency(totals.gross)} · FGTS{" "}
                    {formatCurrency(totals.fgts)}
                  </p>
                )}
              </div>

              <Alert>
                <AlertDescription>
                  O cálculo usa o espelho de ponto do mês e as tabelas de INSS e
                  IRRF cadastradas. Revise cada holerite antes de emitir e
                  confira com seu contador. Dias de férias saem do salário do
                  mês, porque são pagos no recibo de férias. Rescisão ainda é
                  feita fora do sistema.
                </AlertDescription>
              </Alert>

              {payrollQuery.error ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {payrollQuery.error.message}
                  </AlertDescription>
                </Alert>
              ) : !rows ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : rows.length === 0 ? (
                <ListEmptyState
                  icon={Wallet}
                  title="Nenhum funcionário neste mês"
                  description="Cadastre funcionários com data de admissão para gerar a folha."
                  createLabel="Ir para Funcionários"
                  canCreate
                  onCreate={() => router.push(employeesHref)}
                />
              ) : (
                <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                  {rows.map((row) => {
                    const status = getRowStatus(row);
                    const isOpening =
                      generateMutation.isPending &&
                      generateMutation.variables?.employeeId === row.employeeId;
                    return (
                      <li
                        key={row.employeeId}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_7rem_repeat(3,8rem)_auto]"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {row.employeeName}
                          </span>
                          <span className="truncate text-muted-foreground text-xs">
                            {row.jobTitle}
                          </span>
                        </div>
                        <Badge
                          variant={status.variant}
                          className="justify-self-end md:justify-self-start"
                        >
                          {status.label}
                        </Badge>
                        <div className="col-span-2 grid grid-cols-3 gap-2 text-sm tabular-nums md:col-span-3">
                          <div className="flex flex-col md:items-end">
                            <span className="text-muted-foreground text-xs">
                              Bruto
                            </span>
                            <span>
                              {row.payslip
                                ? formatCurrency(row.payslip.grossAmount)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex flex-col md:items-end">
                            <span className="text-muted-foreground text-xs">
                              Descontos
                            </span>
                            <span>
                              {row.payslip
                                ? formatCurrency(row.payslip.deductionAmount)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex flex-col md:items-end">
                            <span className="text-muted-foreground text-xs">
                              Líquido
                            </span>
                            <span className="font-semibold">
                              {row.payslip
                                ? formatCurrency(row.payslip.netAmount)
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="col-span-2 h-10 md:col-span-1"
                          disabled={isOpening}
                          aria-busy={isOpening}
                          onClick={() => openRow(row)}
                        >
                          {isOpening ? (
                            <Spinner aria-hidden />
                          ) : row.payslip ? (
                            <FileText aria-hidden />
                          ) : (
                            <Calculator aria-hidden />
                          )}
                          {row.payslip ? "Ver holerite" : "Calcular"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>

      <PayslipDialog
        organizationId={organizationId}
        payslip={selectedPayslip}
        business={business}
        onClose={() => setSelectedEmployeeId(null)}
      />
      <PayrollSettingsDialog
        organizationId={organizationId}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
