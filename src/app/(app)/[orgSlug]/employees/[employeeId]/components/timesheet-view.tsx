"use client";

import {
  ArrowLeft,
  CalendarOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmployeeId } from "@/features/employees/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteTimeOffMutation } from "@/features/time-clock/hooks/use-delete-time-off-mutation";
import { useTimesheetQuery } from "@/features/time-clock/hooks/use-timesheet-query";
import { TIME_OFF_KIND_LABELS } from "@/features/time-clock/labels";
import type { TimesheetData } from "@/features/time-clock/load-timesheet";
import {
  formatMinutes,
  formatMonthLabel,
  formatSignedMinutes,
  parseMonthKey,
  shiftMonthKey,
} from "@/features/time-clock/time-utils";
import type { TimesheetPunch } from "@/features/time-clock/timesheet";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { formatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageContent } from "../../../components/page-content";
import { PageHeader } from "../../../components/page-header";
import { ManualPunchDialog } from "./manual-punch-dialog";
import { PunchDetailsDialog } from "./punch-details-dialog";
import { TimeOffDialog } from "./time-off-dialog";
import { TimesheetDayRow } from "./timesheet-day-row";

type TimesheetViewProps = {
  organizationId: OrganizationId;
  employeeId: EmployeeId;
  employeesHref: string;
  business: OrderTicketBusiness;
  initialMonthKey: string;
};

type SummaryStatProps = {
  label: string;
  value: string;
  detail?: string;
  isAlert?: boolean;
};

function SummaryStat({ label, value, detail, isAlert }: SummaryStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "font-bold text-xl tabular-nums tracking-tight",
          isAlert && "text-destructive",
        )}
      >
        {value}
      </span>
      {detail && (
        <span className="text-muted-foreground text-xs">{detail}</span>
      )}
    </div>
  );
}

function TimesheetSummaryGrid({ data }: { data: TimesheetData }) {
  const { summary } = data.timesheet;
  const isHourBank = data.employee.overtimePolicy === "hour_bank";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <SummaryStat
        label="Trabalhado"
        value={formatMinutes(summary.workedMinutes)}
        detail={`de ${formatMinutes(summary.expectedMinutes)} previstas`}
      />
      <SummaryStat
        label="Horas extras"
        value={formatMinutes(summary.overtimeMinutes)}
        detail={`${formatMinutes(summary.restDayWorkedMinutes)} em descanso/feriado`}
      />
      <SummaryStat
        label="Atrasos e saídas"
        value={formatMinutes(summary.shortfallMinutes)}
        detail={`${summary.lateDays} ${summary.lateDays === 1 ? "dia" : "dias"} com atraso`}
        isAlert={summary.shortfallMinutes > 0}
      />
      <SummaryStat
        label="Faltas"
        value={`${summary.absenceDays}`}
        detail={
          summary.lostRestDays > 0
            ? `${summary.lostRestDays} DSR perdido`
            : "sem justificativa"
        }
        isAlert={summary.absenceDays > 0}
      />
      <SummaryStat
        label="Adicional noturno"
        value={formatMinutes(summary.nightMinutes)}
        detail="22h às 5h"
      />
      <SummaryStat
        label={isHourBank ? "Banco de horas" : "Saldo do mês"}
        value={formatSignedMinutes(
          isHourBank
            ? data.previousHourBankMinutes + summary.balanceMinutes
            : summary.balanceMinutes,
        )}
        detail={
          isHourBank
            ? `${formatSignedMinutes(summary.balanceMinutes)} neste mês`
            : "extras menos atrasos e faltas"
        }
        isAlert={summary.balanceMinutes < 0}
      />
    </div>
  );
}

export function TimesheetView({
  organizationId,
  employeeId,
  employeesHref,
  business,
  initialMonthKey,
}: TimesheetViewProps) {
  const [monthKey, setMonthKey] = useSearchParamState({
    key: "month",
    defaultValue: initialMonthKey,
    parse: parseMonthKey,
  });
  const timesheetQuery = useTimesheetQuery(
    organizationId,
    employeeId,
    monthKey,
  );
  const deleteTimeOffMutation = useDeleteTimeOffMutation(organizationId);
  const [manualPunchDate, setManualPunchDate] = useState<string | null>(null);
  const [timeOffDate, setTimeOffDate] = useState<string | null>(null);
  const [selectedPunch, setSelectedPunch] = useState<TimesheetPunch | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);
  const data = timesheetQuery.data;
  const defaultDate = data?.today.startsWith(monthKey)
    ? data.today
    : `${monthKey}-01`;

  function showPreviousMonth() {
    setMonthKey((currentMonthKey) => shiftMonthKey(currentMonthKey, -1));
  }

  function showNextMonth() {
    setMonthKey((currentMonthKey) => shiftMonthKey(currentMonthKey, 1));
  }

  async function handleExport(exportFormat: "pdf" | "csv") {
    if (!data) return;
    setIsExporting(true);
    try {
      const { exportPunchesCsv, exportTimesheetPdf } = await import(
        "@/features/time-clock/export-timesheet"
      );
      const input = {
        business,
        employee: data.employee,
        schedule: data.schedule,
        timesheet: data.timesheet,
        monthKey,
        timeZone: data.timeZone,
      };
      if (exportFormat === "pdf") await exportTimesheetPdf(input);
      else exportPunchesCsv(input);
    } catch {
      toast.error("Não foi possível exportar o espelho.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={data?.employee.name ?? "Espelho de ponto"}
        description={
          data
            ? `Espelho de ponto · ${data.employee.jobTitle}${data.schedule ? ` · ${data.schedule.name}` : ""}`
            : "Espelho de ponto"
        }
        actions={
          <Button
            variant="outline"
            className="h-10"
            render={<Link href={employeesHref} />}
            nativeButton={false}
          >
            <ArrowLeft aria-hidden />
            <span className="max-sm:sr-only">Funcionários</span>
          </Button>
        }
      />
      <PageContent>
        <div className="flex min-h-0 flex-col gap-5">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg border px-1 py-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mês anterior"
                onClick={showPreviousMonth}
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
                onClick={showNextMonth}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10"
                disabled={!data}
                onClick={() => setManualPunchDate(defaultDate)}
              >
                <Plus aria-hidden />
                Incluir marcação
              </Button>
              <Button
                variant="outline"
                className="h-10"
                disabled={!data}
                onClick={() => setTimeOffDate(defaultDate)}
              >
                <CalendarOff aria-hidden />
                Lançar ausência
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="h-10"
                      disabled={!data || isExporting}
                      aria-busy={isExporting}
                    />
                  }
                >
                  <Download aria-hidden />
                  Exportar
                  <ChevronDown aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <FileText aria-hidden />
                    Espelho em PDF para assinar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileSpreadsheet aria-hidden />
                    Marcações em planilha (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto">
            {timesheetQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {timesheetQuery.error.message}
                </AlertDescription>
              </Alert>
            ) : !data ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            ) : (
              <>
                {!data.schedule && (
                  <Alert>
                    <AlertDescription>
                      Esse funcionário está sem jornada. Sem o horário
                      contratual não dá para calcular atrasos, faltas e horas
                      extras. Defina a jornada no cadastro.
                    </AlertDescription>
                  </Alert>
                )}
                {data.timesheet.summary.inconsistentDays > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {data.timesheet.summary.inconsistentDays}{" "}
                      {data.timesheet.summary.inconsistentDays === 1
                        ? "dia está"
                        : "dias estão"}{" "}
                      com marcação faltando. Inclua a marcação que falta com o
                      motivo, ou desconsidere a que estiver errada.
                    </AlertDescription>
                  </Alert>
                )}

                <TimesheetSummaryGrid data={data} />

                <section className="overflow-hidden rounded-2xl border bg-card">
                  <div className="hidden grid-cols-[4.5rem_minmax(0,1.4fr)_5rem_5rem_5rem_minmax(0,1.2fr)_2rem] gap-x-3 border-b px-4 py-2.5 text-muted-foreground text-xs md:grid">
                    <span>Dia</span>
                    <span>Marcações</span>
                    <span className="text-right">Previsto</span>
                    <span className="text-right">Trabalhado</span>
                    <span className="text-right">Saldo</span>
                    <span>Ocorrências</span>
                    <span className="sr-only">Ações</span>
                  </div>
                  <ul className="divide-y">
                    {data.timesheet.days.map((day) => (
                      <TimesheetDayRow
                        key={day.date}
                        day={day}
                        onOpenPunch={setSelectedPunch}
                        onAddPunch={setManualPunchDate}
                        onAddTimeOff={setTimeOffDate}
                      />
                    ))}
                  </ul>
                </section>

                {data.timeOff.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h2 className="font-semibold">Ausências no mês</h2>
                    <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                      {data.timeOff.map((timeOff) => (
                        <li
                          key={timeOff.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="font-medium text-sm">
                              {TIME_OFF_KIND_LABELS[timeOff.kind]} ·{" "}
                              {formatDateKey(timeOff.startDate)}
                              {timeOff.endDate !== timeOff.startDate &&
                                ` a ${formatDateKey(timeOff.endDate)}`}
                            </span>
                            {(timeOff.notes || timeOff.createdByName) && (
                              <span className="truncate text-muted-foreground text-xs">
                                {[
                                  timeOff.notes,
                                  timeOff.createdByName &&
                                    `lançado por ${timeOff.createdByName}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Excluir ausência"
                            className="text-destructive"
                            disabled={deleteTimeOffMutation.isPending}
                            onClick={() =>
                              deleteTimeOffMutation.mutate(timeOff.id, {
                                onSuccess: () =>
                                  toast.success("Ausência excluída."),
                                onError: (error) => toast.error(error.message),
                              })
                            }
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </PageContent>

      <ManualPunchDialog
        organizationId={organizationId}
        employeeId={employeeId}
        initialDate={manualPunchDate}
        onClose={() => setManualPunchDate(null)}
      />
      <TimeOffDialog
        organizationId={organizationId}
        employeeId={employeeId}
        initialDate={timeOffDate}
        onClose={() => setTimeOffDate(null)}
      />
      <PunchDetailsDialog
        organizationId={organizationId}
        punch={selectedPunch}
        timeZone={data?.timeZone ?? "America/Sao_Paulo"}
        onClose={() => setSelectedPunch(null)}
      />
    </>
  );
}
