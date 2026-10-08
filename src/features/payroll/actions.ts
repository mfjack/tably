"use server";

import { getEmployeeStatus } from "@/features/employees/labels";
import { EMPLOYEE_COLUMNS, toEmployee } from "@/features/employees/mappers";
import type { EmployeeId } from "@/features/employees/types";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  getOrganizationClock,
  loadTimesheet,
} from "@/features/time-clock/load-timesheet";
import {
  getMonthEnd,
  getMonthKey,
  getMonthStart,
} from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { getDatabaseErrorMessage } from "@/lib/database-errors";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { calculatePayslip } from "./calculate-payslip";
import {
  PAYSLIP_COLUMNS,
  PAYSLIP_ERROR_MESSAGES,
  readPayrollSettings,
  toEmployeeSnapshot,
  toPayslip,
} from "./payslip-data";
import {
  getSalaryPaymentDate,
  getSalaryPaymentMonths,
} from "./salary-payment-date";
import {
  fromPayrollSettingsInput,
  type ManualPayslipItemInput,
  manualPayslipItemSchema,
  monthKeySchema,
  type PayrollSettingsInput,
  payrollSettingsSchema,
} from "./schemas";
import type {
  ManualPayslipItem,
  PayrollMonth,
  PayrollSettings,
  Payslip,
  PayslipId,
  SalaryPaymentSchedule,
} from "./types";

export async function getPayrollSettings(
  organizationId: OrganizationId,
): Promise<ActionResult<PayrollSettings>> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const settings = await readPayrollSettings(organizationId);
  if (!settings) {
    return actionFailure("Não foi possível carregar as tabelas da folha.");
  }
  return actionSuccess(settings);
}

export async function savePayrollSettings(
  organizationId: OrganizationId,
  input: PayrollSettingsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = payrollSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payroll_settings").upsert({
    organization_id: organizationId,
    ...fromPayrollSettingsInput(parsedInput.data),
  });

  if (error)
    return databaseFailure("Não foi possível salvar as tabelas.", error);
  return actionSuccess();
}

export async function getPayrollMonth(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<ActionResult<PayrollMonth>> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  if (!monthKeySchema.safeParse(monthKey).success) {
    return actionFailure("Mês inválido.");
  }

  const clock = await getOrganizationClock(organizationId);
  if (!clock) return actionFailure("Não foi possível carregar a folha.");

  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const supabase = await createClient();
  const [employeesResult, payslipsResult] = await Promise.all([
    supabase
      .from("employees")
      .select(EMPLOYEE_COLUMNS)
      .eq("organization_id", organizationId)
      .lte("admission_date", monthEnd)
      .or(`termination_date.is.null,termination_date.gte.${monthStart}`)
      .order("name"),
    supabase
      .from("payslips")
      .select(PAYSLIP_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("reference_month", monthStart)
      .eq("kind", "monthly"),
  ]);

  if (employeesResult.error || payslipsResult.error) {
    return actionFailure("Não foi possível carregar a folha.");
  }

  const payslipsByEmployeeId = new Map(
    payslipsResult.data.map((row) => [row.employee_id, toPayslip(row)]),
  );

  return actionSuccess({
    monthKey,
    rows: employeesResult.data.map((row) => {
      const employee = toEmployee(row);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        jobTitle: employee.jobTitle,
        status: getEmployeeStatus(employee, clock.today),
        payslip: payslipsByEmployeeId.get(employee.id) ?? null,
      };
    }),
  });
}

async function resolveSalaryPaymentDate(
  organizationId: OrganizationId,
  monthKey: string,
  schedule: SalaryPaymentSchedule,
): Promise<string> {
  const [firstMonthKey, lastMonthKey] = getSalaryPaymentMonths(monthKey);
  const supabase = await createClient();
  const { data: holidayRows } = await supabase
    .from("holidays")
    .select("holiday_date")
    .eq("organization_id", organizationId)
    .gte("holiday_date", getMonthStart(firstMonthKey))
    .lte("holiday_date", getMonthEnd(lastMonthKey));
  return getSalaryPaymentDate(
    monthKey,
    schedule,
    new Set((holidayRows ?? []).map((holiday) => holiday.holiday_date)),
  );
}

async function writePayslip(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
  manualItemsOverride?: ManualPayslipItem[],
): Promise<ActionResult> {
  const [timesheetData, settings] = await Promise.all([
    loadTimesheet(organizationId, employeeId, monthKey),
    readPayrollSettings(organizationId),
  ]);
  if (!timesheetData || !settings) {
    return actionFailure("Não foi possível calcular o holerite.");
  }

  const supabase = await createClient();
  const paymentDueDate = await resolveSalaryPaymentDate(
    organizationId,
    monthKey,
    settings.salaryPayment,
  );
  const { data: existingRow, error: existingError } = await supabase
    .from("payslips")
    .select(PAYSLIP_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("reference_month", getMonthStart(monthKey))
    .eq("kind", "monthly")
    .maybeSingle();

  if (existingError)
    return actionFailure("Não foi possível calcular o holerite.");

  const existingPayslip = existingRow ? toPayslip(existingRow) : null;
  if (existingPayslip?.status === "issued") {
    return actionFailure(PAYSLIP_ERROR_MESSAGES.TB009);
  }

  const { employee, timesheet, previousHourBankMinutes } = timesheetData;
  const manualItems = manualItemsOverride ?? existingPayslip?.manualItems ?? [];
  const totals = calculatePayslip({
    employee,
    monthKey,
    summary: timesheet.summary,
    settings,
    manualItems,
    previousHourBankMinutes,
  });
  const snapshot = toEmployeeSnapshot(employee);

  const { error } = await supabase.from("payslips").upsert(
    {
      organization_id: organizationId,
      employee_id: employeeId,
      reference_month: getMonthStart(monthKey),
      kind: "monthly",
      status: "draft",
      employee_snapshot: snapshot satisfies Json,
      items: totals.items satisfies Json,
      manual_items: manualItems satisfies Json,
      timesheet_summary: timesheet.summary satisfies Json,
      gross_amount: totals.grossAmount,
      deduction_amount: totals.deductionAmount,
      net_amount: totals.netAmount,
      inss_base: totals.inssBase,
      irrf_base: totals.irrfBase,
      fgts_base: totals.fgtsBase,
      fgts_amount: totals.fgtsAmount,
      hour_bank_balance_minutes: totals.hourBankBalanceMinutes,
      payment_due_date: paymentDueDate,
    },
    { onConflict: "employee_id,reference_month,kind" },
  );

  if (error) {
    return actionFailure(
      PAYSLIP_ERROR_MESSAGES[error.code] ??
        "Não foi possível salvar o holerite.",
    );
  }
  return actionSuccess();
}

export async function generatePayslip(
  organizationId: OrganizationId,
  employeeId: EmployeeId,
  monthKey: string,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  if (!monthKeySchema.safeParse(monthKey).success) {
    return actionFailure("Mês inválido.");
  }
  return writePayslip(organizationId, employeeId, monthKey);
}

export async function generateAllPayslips(
  organizationId: OrganizationId,
  monthKey: string,
): Promise<ActionResult<{ generatedCount: number }>> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const payrollMonth = await getPayrollMonth(organizationId, monthKey);
  if (payrollMonth.status === "error") return payrollMonth;

  const pendingRows = payrollMonth.data.rows.filter(
    (row) => row.payslip?.status !== "issued",
  );
  const results = await Promise.all(
    pendingRows.map((row) =>
      writePayslip(organizationId, row.employeeId, monthKey),
    ),
  );
  const failedCount = results.filter(
    (result) => result.status === "error",
  ).length;

  if (failedCount > 0) {
    return actionFailure(
      `${failedCount} ${failedCount === 1 ? "holerite não pôde" : "holerites não puderam"} ser calculados. Tente de novo.`,
    );
  }
  return actionSuccess({ generatedCount: results.length });
}

export async function addManualPayslipItem(
  organizationId: OrganizationId,
  payslip: Pick<Payslip, "employeeId" | "monthKey" | "manualItems">,
  input: ManualPayslipItemInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = manualPayslipItemSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }
  return writePayslip(organizationId, payslip.employeeId, payslip.monthKey, [
    ...payslip.manualItems,
    { ...parsedInput.data, id: crypto.randomUUID() },
  ]);
}

export async function removeManualPayslipItem(
  organizationId: OrganizationId,
  payslip: Pick<Payslip, "employeeId" | "monthKey" | "manualItems">,
  manualItemId: string,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  return writePayslip(
    organizationId,
    payslip.employeeId,
    payslip.monthKey,
    payslip.manualItems.filter((item) => item.id !== manualItemId),
  );
}

async function setPayslipStatus(
  organizationId: OrganizationId,
  payslipId: PayslipId,
  status: Payslip["status"],
  fallbackMessage: string,
  paymentDueDate?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payslips")
    .update(
      paymentDueDate
        ? { status, payment_due_date: paymentDueDate }
        : { status },
    )
    .eq("id", payslipId)
    .eq("organization_id", organizationId);

  if (error) {
    return actionFailure(
      getDatabaseErrorMessage(PAYSLIP_ERROR_MESSAGES, error, fallbackMessage),
    );
  }
  return actionSuccess();
}

export async function issuePayslip(
  organizationId: OrganizationId,
  payslipId: PayslipId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { data: payslipRow } = await supabase
    .from("payslips")
    .select("kind, reference_month")
    .eq("id", payslipId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  const settings =
    payslipRow?.kind === "monthly"
      ? await readPayrollSettings(organizationId)
      : null;
  const paymentDueDate =
    payslipRow && settings
      ? await resolveSalaryPaymentDate(
          organizationId,
          getMonthKey(payslipRow.reference_month),
          settings.salaryPayment,
        )
      : undefined;

  return setPayslipStatus(
    organizationId,
    payslipId,
    "issued",
    "Não foi possível emitir o holerite.",
    paymentDueDate,
  );
}

export async function reopenPayslip(
  organizationId: OrganizationId,
  payslipId: PayslipId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "payroll"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  return setPayslipStatus(
    organizationId,
    payslipId,
    "draft",
    "Não foi possível reabrir o holerite.",
  );
}
