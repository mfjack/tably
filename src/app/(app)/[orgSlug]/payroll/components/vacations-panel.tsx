"use client";

import { CalendarPlus, FileText } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useVacationsOverviewQuery } from "@/features/payroll/hooks/use-vacations-overview-query";
import { describePayslipPeriod } from "@/features/payroll/payslip-labels";
import type { PayslipId, VacationEmployee } from "@/features/payroll/types";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { PayslipDialog } from "./payslip-dialog";
import { VacationFormDialog } from "./vacation-form-dialog";

type VacationsPanelProps = {
  organizationId: OrganizationId;
  business: OrderTicketBusiness;
};

function EntitlementStatus({ employee }: { employee: VacationEmployee }) {
  if (employee.entitlement.status === "accruing") {
    return (
      <span className="text-muted-foreground text-sm">
        Direito a partir de {formatDateKey(employee.entitlement.entitledFrom)}
      </span>
    );
  }
  if (employee.entitlement.periods.length === 0) {
    return <span className="text-muted-foreground text-sm">Em dia</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      {employee.entitlement.periods.map((period) => (
        <span key={period.start} className="flex items-center gap-2 text-sm">
          {period.isOverdue && <Badge variant="destructive">Vencidas</Badge>}
          <span className="tabular-nums">
            {period.daysAvailable} dias · tirar até{" "}
            {formatDateKey(period.concessionDeadline)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function VacationsPanel({
  organizationId,
  business,
}: VacationsPanelProps) {
  const overviewQuery = useVacationsOverviewQuery(organizationId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<PayslipId | null>(
    null,
  );
  const overview = overviewQuery.data;
  const selectedPayslip =
    overview?.vacations.find((vacation) => vacation.id === selectedPayslipId) ??
    null;
  const hasOverdue = overview?.employees.some(
    (employee) =>
      employee.entitlement.status === "entitled" &&
      employee.entitlement.periods.some((period) => period.isOverdue),
  );

  if (overviewQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{overviewQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Cada 12 meses de trabalho dão direito a 30 dias de férias, que
          precisam ser tiradas nos 12 meses seguintes.
        </p>
        <Button
          className="h-10"
          disabled={!overview}
          onClick={() => setIsFormOpen(true)}
        >
          <CalendarPlus aria-hidden />
          Programar férias
        </Button>
      </div>

      {hasOverdue && (
        <Alert variant="destructive">
          <AlertDescription>
            Há férias vencidas. Férias fora do prazo precisam ser pagas em dobro
            (CLT, art. 137). Programe o quanto antes.
          </AlertDescription>
        </Alert>
      )}

      {!overview ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Saldo de férias</h2>
            {overview.employees.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum funcionário CLT ativo.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                {overview.employees.map((employee) => (
                  <li
                    key={employee.employeeId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {employee.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {employee.jobTitle} · admissão{" "}
                        {formatDateKey(employee.admissionDate)}
                      </span>
                    </div>
                    <EntitlementStatus employee={employee} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Férias programadas</h2>
            {overview.vacations.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
                Nenhuma férias programada ainda.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                {overview.vacations.map((vacation) => (
                  <li
                    key={vacation.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 basis-56 flex-col">
                      <span className="truncate font-medium">
                        {vacation.employee.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {describePayslipPeriod(vacation)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(vacation.netAmount)}
                      </span>
                      <Badge
                        variant={
                          vacation.status === "issued" ? "default" : "secondary"
                        }
                      >
                        {vacation.status === "issued" ? "Emitido" : "Rascunho"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => setSelectedPayslipId(vacation.id)}
                    >
                      <FileText aria-hidden />
                      Ver recibo
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <VacationFormDialog
        organizationId={organizationId}
        isOpen={isFormOpen}
        employees={overview?.employees ?? []}
        onClose={() => setIsFormOpen(false)}
      />
      <PayslipDialog
        organizationId={organizationId}
        payslip={selectedPayslip}
        business={business}
        onClose={() => setSelectedPayslipId(null)}
      />
    </div>
  );
}
