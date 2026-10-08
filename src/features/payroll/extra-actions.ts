"use server";

import { addDays, format, parseISO, subMonths } from "date-fns";
import { EMPLOYEE_COLUMNS, toEmployee } from "@/features/employees/mappers";
import type { Employee, EmployeeId } from "@/features/employees/types";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import type { TimesheetSummary } from "@/features/time-clock/timesheet";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { isUniqueViolation } from "@/lib/database-errors";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  calculateThirteenth,
  calculateVacationPay,
  calculateVariableAverage,
  countThirteenthMonths,
} from "./calculate-extra-payslips";
import {
  PAYSLIP_COLUMNS,
  PAYSLIP_ERROR_MESSAGES,
  readPayrollSettings,
  toEmployeeSnapshot,
  toPayslip,
} from "./payslip-data";
import {
  SOLD_VACATION_DAYS,
  type ThirteenthInstallment,
  type VacationInput,
  vacationSchema,
} from "./schemas";
import type {
  Payslip,
  PayslipDetails,
  PayslipId,
  PayslipItem,
  PayslipKind,
  ThirteenthYear,
  VacationsOverview,
} from "./types";
import { getVacationEntitlement } from "./vacation-entitlement";

const ACCESS_DENIED = actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
const VACATION_PAYMENT_DAYS_BEFORE = 2;
const VARIABLE_HISTORY_MONTHS = 12;
const VACATION_HISTORY_MONTHS = 36;

const EMPTY_SUMMARY: TimesheetSummary = {
  expectedMinutes: 0,
  workedMinutes: 0,
  overtimeMinutes: 0,
  restDayWorkedMinutes: 0,
  shortfallMinutes: 0,
  absenceDays: 0,
  absenceMinutes: 0,
  lostRestDays: 0,
  nightMinutes: 0,
  breakShortfallMinutes: 0,
  balanceMinutes: 0,
  lateDays: 0,
  inconsistentDays: 0,
  businessDays: 0,
  restDays: 0,
  monthlyHours: 0,
  vacationDays: 0,
};

const THIRTEENTH_KINDS = {
  first: "thirteenth_first",
  second: "thirteenth_second",
} as const satisfies Record<ThirteenthInstallment, PayslipKind>;

async function canUsePayroll(organizationId: OrganizationId) {
  return hasModuleAccess(organizationId, "payroll");
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toMonthStart(date: Date): string {
  return format(date, "yyyy-MM-01");
}

function toPayslips(rows: Parameters<typeof toPayslip>[0][]): Payslip[] {
  return rows.flatMap((row) => {
    const payslip = toPayslip(row);
    return payslip ? [payslip] : [];
  });
}

async function loadVariableHistory(
  employeeId: EmployeeId,
  fromMonth: string,
  toMonth: string,
): Promise<PayslipItem[][]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payslips")
    .select(PAYSLIP_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("kind", "monthly")
    .eq("status", "issued")
    .gte("reference_month", fromMonth)
    .lte("reference_month", toMonth);
  return toPayslips(data ?? []).map((payslip) => payslip.items);
}

async function loadVacationPayslips(
  organizationId: OrganizationId,
  fromMonth: string,
): Promise<Payslip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payslips")
    .select(PAYSLIP_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("kind", "vacation")
    .gte("reference_month", fromMonth)
    .order("reference_month", { ascending: false });
  return toPayslips(data ?? []);
}

function toUsedVacations(payslips: readonly Payslip[]) {
  return payslips.flatMap((payslip) =>
    payslip.details.acquisitionStart
      ? [
          {
            acquisitionStart: payslip.details.acquisitionStart,
            days: payslip.details.days ?? 0,
            soldDays: payslip.details.soldDays ?? 0,
          },
        ]
      : [],
  );
}

export async function getVacationsOverview(
  organizationId: OrganizationId,
): Promise<ActionResult<VacationsOverview>> {
  if (!(await canUsePayroll(organizationId))) return ACCESS_DENIED;

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar as férias.");

  const supabase = await createClient();
  const [employeesResult, vacations] = await Promise.all([
    supabase
      .from("employees")
      .select(EMPLOYEE_COLUMNS)
      .eq("organization_id", organizationId)
      .or(`termination_date.is.null,termination_date.gte.${clock.today}`)
      .neq("employment_type", "intern")
      .order("name"),
    loadVacationPayslips(
      organizationId,
      toMonthStart(subMonths(parseISO(clock.today), VACATION_HISTORY_MONTHS)),
    ),
  ]);

  if (employeesResult.error) {
    return actionFailure("Não foi possível carregar as férias.");
  }

  return actionSuccess({
    today: clock.today,
    vacations,
    employees: employeesResult.data.map((row) => {
      const employee = toEmployee(row);
      return {
        employeeId: employee.id,
        name: employee.name,
        jobTitle: employee.jobTitle,
        admissionDate: employee.admissionDate,
        entitlement: getVacationEntitlement(
          employee.admissionDate,
          clock.today,
          toUsedVacations(
            vacations.filter((vacation) => vacation.employeeId === employee.id),
          ),
        ),
      };
    }),
  });
}

export async function createVacation(
  organizationId: OrganizationId,
  input: VacationInput,
): Promise<ActionResult> {
  if (!(await canUsePayroll(organizationId))) return ACCESS_DENIED;

  const parsedInput = vacationSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { employeeId, startDate, days, sellsDays } = parsedInput.data;
  const soldDays = sellsDays ? SOLD_VACATION_DAYS : 0;
  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível programar as férias.");

  const supabase = await createClient();
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .single();

  if (employeeError)
    return databaseFailure("Funcionário não encontrado.", employeeError);
  const employee = toEmployee(employeeRow);

  const vacations = (
    await loadVacationPayslips(organizationId, "1900-01-01")
  ).filter((vacation) => vacation.employeeId === employee.id);
  const entitlement = getVacationEntitlement(
    employee.admissionDate,
    clock.today,
    toUsedVacations(vacations),
  );

  if (entitlement.status === "accruing") {
    return actionFailure(
      `${employee.name} ainda não completou 12 meses de empresa. O direito a férias começa em ${format(parseISO(entitlement.entitledFrom), "dd/MM/yyyy")}.`,
    );
  }

  const period = entitlement.periods.find(
    (candidate) => candidate.daysAvailable >= days + soldDays,
  );
  if (!period) {
    const available = entitlement.periods[0]?.daysAvailable ?? 0;
    return actionFailure(
      `Saldo insuficiente: há ${available} dias de férias disponíveis no período aquisitivo mais antigo.`,
    );
  }

  const settings = await readPayrollSettings(organizationId);
  if (!settings)
    return actionFailure("Não foi possível ler as tabelas da folha.");

  const start = parseISO(startDate);
  const endDate = toDateKey(addDays(start, days - 1));
  const variableAverage = calculateVariableAverage(
    await loadVariableHistory(
      employee.id,
      toMonthStart(subMonths(start, VARIABLE_HISTORY_MONTHS)),
      startDate,
    ),
  );
  const totals = calculateVacationPay({
    employee,
    settings,
    days,
    soldDays,
    variableAverage,
  });

  const { data: timeOff, error: timeOffError } = await supabase
    .from("employee_time_off")
    .insert({
      organization_id: organizationId,
      employee_id: employee.id,
      kind: "vacation",
      start_date: startDate,
      end_date: endDate,
      notes: "Férias programadas pela folha",
    })
    .select("id")
    .single();

  if (timeOffError)
    return actionFailure("Não foi possível programar as férias.");

  const details: PayslipDetails = {
    startDate,
    endDate,
    days,
    soldDays,
    acquisitionStart: period.start,
    acquisitionEnd: period.end,
    variableAverage,
  };
  const { error } = await supabase.from("payslips").insert({
    organization_id: organizationId,
    employee_id: employee.id,
    reference_month: `${startDate.slice(0, 7)}-01`,
    kind: "vacation",
    status: "draft",
    details: details satisfies Json,
    payment_due_date: toDateKey(addDays(start, -VACATION_PAYMENT_DAYS_BEFORE)),
    time_off_id: timeOff.id,
    employee_snapshot: toEmployeeSnapshot(employee) satisfies Json,
    items: totals.items satisfies Json,
    manual_items: [],
    timesheet_summary: EMPTY_SUMMARY satisfies Json,
    gross_amount: totals.grossAmount,
    deduction_amount: totals.deductionAmount,
    net_amount: totals.netAmount,
    inss_base: totals.inssBase,
    irrf_base: totals.irrfBase,
    fgts_base: totals.fgtsBase,
    fgts_amount: totals.fgtsAmount,
  });

  if (error) {
    await supabase.from("employee_time_off").delete().eq("id", timeOff.id);
    return actionFailure(
      isUniqueViolation(error)
        ? "Já existem férias desse funcionário começando nesse mês."
        : "Não foi possível programar as férias.",
    );
  }
  return actionSuccess();
}

export async function deleteExtraPayslip(
  organizationId: OrganizationId,
  payslipId: PayslipId,
): Promise<ActionResult> {
  if (!(await canUsePayroll(organizationId))) return ACCESS_DENIED;

  const supabase = await createClient();
  const { data: payslip, error: payslipError } = await supabase
    .from("payslips")
    .select("kind, status, time_off_id")
    .eq("id", payslipId)
    .eq("organization_id", organizationId)
    .single();

  if (payslipError || payslip.kind === "monthly") {
    return actionFailure("Holerite não encontrado.");
  }
  if (payslip.status === "issued") {
    return actionFailure(PAYSLIP_ERROR_MESSAGES.TB009);
  }

  const { error } = await supabase
    .from("payslips")
    .delete()
    .eq("id", payslipId)
    .eq("organization_id", organizationId);

  if (error) return databaseFailure("Não foi possível excluir.", error);

  if (payslip.time_off_id) {
    await supabase
      .from("employee_time_off")
      .delete()
      .eq("id", payslip.time_off_id);
  }
  return actionSuccess();
}

function isEmployedInYear(employee: Employee, year: number) {
  return (
    employee.admissionDate <= `${year}-12-31` &&
    (employee.terminationDate === null ||
      employee.terminationDate >= `${year}-01-01`)
  );
}

export async function getThirteenthYear(
  organizationId: OrganizationId,
  year: number,
): Promise<ActionResult<ThirteenthYear>> {
  if (!(await canUsePayroll(organizationId))) return ACCESS_DENIED;
  if (!Number.isInteger(year)) return actionFailure("Ano inválido.");

  const supabase = await createClient();
  const [employeesResult, payslipsResult] = await Promise.all([
    supabase
      .from("employees")
      .select(EMPLOYEE_COLUMNS)
      .eq("organization_id", organizationId)
      .neq("employment_type", "intern")
      .order("name"),
    supabase
      .from("payslips")
      .select(PAYSLIP_COLUMNS)
      .eq("organization_id", organizationId)
      .in("kind", ["thirteenth_first", "thirteenth_second"])
      .in("reference_month", [`${year}-11-01`, `${year}-12-01`]),
  ]);

  if (employeesResult.error || payslipsResult.error) {
    return actionFailure("Não foi possível carregar o 13º.");
  }

  const payslips = toPayslips(payslipsResult.data);
  return actionSuccess({
    year,
    rows: employeesResult.data
      .map(toEmployee)
      .filter((employee) => isEmployedInYear(employee, year))
      .map((employee) => ({
        employeeId: employee.id,
        name: employee.name,
        jobTitle: employee.jobTitle,
        months: countThirteenthMonths(employee, year),
        first:
          payslips.find(
            (payslip) =>
              payslip.employeeId === employee.id &&
              payslip.kind === "thirteenth_first",
          ) ?? null,
        second:
          payslips.find(
            (payslip) =>
              payslip.employeeId === employee.id &&
              payslip.kind === "thirteenth_second",
          ) ?? null,
      })),
  });
}

export async function generateThirteenth(
  organizationId: OrganizationId,
  year: number,
  installment: ThirteenthInstallment,
): Promise<ActionResult<{ generatedCount: number }>> {
  const thirteenthYear = await getThirteenthYear(organizationId, year);
  if (thirteenthYear.status === "error") return thirteenthYear;

  const settings = await readPayrollSettings(organizationId);
  if (!settings)
    return actionFailure("Não foi possível ler as tabelas da folha.");

  const supabase = await createClient();
  const kind = THIRTEENTH_KINDS[installment];
  const referenceMonth =
    installment === "first" ? `${year}-11-01` : `${year}-12-01`;
  const paymentDueDate =
    installment === "first" ? `${year}-11-30` : `${year}-12-20`;
  const pendingRows = thirteenthYear.data.rows.filter(
    (row) =>
      row.months > 0 &&
      (installment === "first" ? row.first : row.second)?.status !== "issued",
  );

  const { data: employeeRows, error: employeesError } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .in(
      "id",
      pendingRows.map((row) => row.employeeId),
    );
  if (employeesError)
    return databaseFailure("Não foi possível calcular o 13º.", employeesError);

  const results = await Promise.all(
    employeeRows.map(async (row) => {
      const employee = toEmployee(row);
      const thirteenthRow = pendingRows.find(
        (candidate) => candidate.employeeId === employee.id,
      );
      if (!thirteenthRow) return true;

      const variableAverage = calculateVariableAverage(
        await loadVariableHistory(
          employee.id,
          `${year}-01-01`,
          `${year}-11-01`,
        ),
      );
      const totals = calculateThirteenth({
        employee,
        settings,
        months: thirteenthRow.months,
        variableAverage,
        installment,
        firstInstallmentAmount: thirteenthRow.first?.grossAmount ?? 0,
      });
      const details: PayslipDetails = {
        year,
        months: thirteenthRow.months,
        variableAverage,
      };
      const { error } = await supabase.from("payslips").upsert(
        {
          organization_id: organizationId,
          employee_id: employee.id,
          reference_month: referenceMonth,
          kind,
          status: "draft",
          details: details satisfies Json,
          payment_due_date: paymentDueDate,
          employee_snapshot: toEmployeeSnapshot(employee) satisfies Json,
          items: totals.items satisfies Json,
          manual_items: [],
          timesheet_summary: EMPTY_SUMMARY satisfies Json,
          gross_amount: totals.grossAmount,
          deduction_amount: totals.deductionAmount,
          net_amount: totals.netAmount,
          inss_base: totals.inssBase,
          irrf_base: totals.irrfBase,
          fgts_base: totals.fgtsBase,
          fgts_amount: totals.fgtsAmount,
        },
        { onConflict: "employee_id,reference_month,kind" },
      );
      return !error;
    }),
  );

  const failedCount = results.filter((isSuccess) => !isSuccess).length;
  if (failedCount > 0) {
    return actionFailure(
      `${failedCount} ${failedCount === 1 ? "cálculo falhou" : "cálculos falharam"}. Tente de novo.`,
    );
  }
  return actionSuccess({ generatedCount: results.length });
}
