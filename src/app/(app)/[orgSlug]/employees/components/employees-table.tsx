"use client";

import {
  CalendarClock,
  KeyRound,
  Pencil,
  RotateCcwKey,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { DataTableRowActionButton } from "@/components/data-table/data-table-row-action-button";
import { useDataTable } from "@/components/data-table/use-data-table";
import { Badge } from "@/components/ui/badge";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  getEmployeeStatus,
} from "@/features/employees/labels";
import type {
  EmployeeWithAccess,
  WorkSchedule,
} from "@/features/employees/types";
import { formatCurrency, formatDateKey } from "@/lib/format";

const EMPTY_EMPLOYEES: EmployeeWithAccess[] = [];

const columnHelper = createDataTableColumnHelper<EmployeeWithAccess>();

type EmployeesTableProps = {
  employees: EmployeeWithAccess[] | undefined;
  workSchedules: readonly WorkSchedule[];
  today: string;
  getTimesheetHref: (employee: EmployeeWithAccess) => string;
  isLoading: boolean;
  errorMessage?: string;
  emptyState: ReactNode;
  onEdit: (employee: EmployeeWithAccess) => void;
  onResetPin: (employee: EmployeeWithAccess) => void;
  onDelete: (employee: EmployeeWithAccess) => void;
};

function getEmployeeRowId(employee: EmployeeWithAccess) {
  return employee.id;
}

export function EmployeesTable({
  employees,
  workSchedules,
  today,
  getTimesheetHref,
  isLoading,
  errorMessage,
  emptyState,
  onEdit,
  onResetPin,
  onDelete,
}: EmployeesTableProps) {
  const columns = useMemo(() => {
    const scheduleNames = new Map(
      workSchedules.map((schedule) => [schedule.id, schedule.name]),
    );
    return columnHelper.columns([
      columnHelper.accessor("name", {
        header: "Funcionário",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Link
              href={getTimesheetHref(row.original)}
              className="truncate font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <span className="truncate text-muted-foreground text-xs">
              {row.original.jobTitle} ·{" "}
              {EMPLOYMENT_TYPE_LABELS[row.original.employmentType]}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((employee) => getEmployeeStatus(employee, today), {
        id: "status",
        header: "Situação",
        enableGlobalFilter: false,
        cell: ({ getValue, row }) => {
          const status = getValue();
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  status === "terminated"
                    ? "outline"
                    : status === "active"
                      ? "default"
                      : "secondary"
                }
              >
                {EMPLOYEE_STATUS_LABELS[status]}
              </Badge>
              {!row.original.hasPin && status !== "terminated" && (
                <Badge variant="outline">
                  <KeyRound aria-hidden />
                  PIN pendente
                </Badge>
              )}
              {row.original.systemAccess && (
                <Badge variant="secondary">Usa o sistema</Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("admissionDate", {
        header: "Admissão",
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex flex-col tabular-nums">
            <span>{formatDateKey(row.original.admissionDate)}</span>
            {row.original.terminationDate ? (
              <span className="text-muted-foreground text-xs">
                Saída {formatDateKey(row.original.terminationDate)}
              </span>
            ) : row.original.effectiveDate ? (
              <span className="text-muted-foreground text-xs">
                Efetivação {formatDateKey(row.original.effectiveDate)}
              </span>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor("salary", {
        header: "Salário",
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatCurrency(getValue())}</span>
        ),
      }),
      columnHelper.accessor(
        (employee) =>
          (employee.workScheduleId &&
            scheduleNames.get(employee.workScheduleId)) ??
          "",
        {
          id: "schedule",
          header: "Jornada",
          enableGlobalFilter: false,
          cell: ({ getValue }) => (
            <span className={getValue() ? "" : "text-muted-foreground"}>
              {getValue() || "Sem jornada"}
            </span>
          ),
        },
      ),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <DataTableRowActionButton
              label="Espelho de ponto"
              accessibleLabel={`Espelho de ponto de ${row.original.name}`}
              icon={CalendarClock}
              href={getTimesheetHref(row.original)}
            />
            {row.original.hasPin && (
              <DataTableRowActionButton
                label="Redefinir PIN"
                accessibleLabel={`Redefinir PIN de ${row.original.name}`}
                icon={RotateCcwKey}
                onClick={() => onResetPin(row.original)}
              />
            )}
            <DataTableRowActionButton
              label="Editar"
              accessibleLabel={`Editar ${row.original.name}`}
              icon={Pencil}
              onClick={() => onEdit(row.original)}
            />
            {row.original.canDelete && (
              <DataTableRowActionButton
                label="Excluir"
                accessibleLabel={`Excluir ${row.original.name}`}
                icon={Trash2}
                variant="destructive"
                onClick={() => onDelete(row.original)}
              />
            )}
          </div>
        ),
      }),
    ]);
  }, [workSchedules, today, getTimesheetHref, onEdit, onResetPin, onDelete]);

  const table = useDataTable({
    data: employees ?? EMPTY_EMPLOYEES,
    columns,
    getRowId: getEmployeeRowId,
  });

  return (
    <DataTable
      table={table}
      searchPlaceholder="Buscar funcionário"
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyState={emptyState}
    />
  );
}
