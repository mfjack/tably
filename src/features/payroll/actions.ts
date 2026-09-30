"use server";

import { z } from "zod";
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
import { getMonthEnd, getMonthStart } from "@/features/time-clock/time-utils";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { calculatePayslip } from "./calculate-payslip";
import {
  fromPayrollSettingsInput,
  type ManualPayslipItemInput,
  manualPayslipItemSchema,
  monthKeySchema,
  type PayrollSettingsInput,
  payrollSettingsSchema,
  storedInssBracketsSchema,
  storedIrrfBracketsSchema,
  storedManualItemsSchema,
  storedPayslipItemsSchema,
} from "./schemas";
import type {
  ManualPayslipItem,
  PayrollMonth,
  PayrollSettings,
  Payslip,
  PayslipEmployeeSnapshot,
  PayslipId,
} from "./types";

const PAYSLIP_COLUMNS =
  "id, employee_id, reference_month, status, employee_snapshot, items, manual_items, timesheet_summary, gross_amount, deduction_amount, net_amount, inss_base, irrf_base, fgts_base, fgts_amount, hour_bank_balance_minutes, issued_at, issued_by_name, updated_at";

const PAYSLIP_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  TB009: "Esse holerite já foi emitido. Reabra antes de alterar.",
};

const employeeSnapshotSchema = z.object({
  name: z.string(),
  cpf: z.string(),
  pis: z.string().nullable(),
  jobTitle: z.string(),
  cbo: z.string().nullable().optional(),
  admissionDate: z.string(),
  salary: z.number(),
  employmentType: z.enum(["clt", "apprentice", "intern"]),
  overtimePolicy: z.enum(["paid", "hour_bank"]),
  dependents: z.number(),
});

const timesheetSummarySchema = z.object({
  expectedMinutes: z.number(),
  workedMinutes: z.number(),
  overtimeMinutes: z.number(),
  restDayWorkedMinutes: z.number(),
  shortfallMinutes: z.number(),
  absenceDays: z.number(),
  absenceMinutes: z.number(),
  lostRestDays: z.number(),
  nightMinutes: z.number(),
  breakShortfallMinutes: z.number(),
  balanceMinutes: z.number(),
  lateDays: z.number(),
  inconsistentDays: z.number(),
  businessDays: z.number(),
  restDays: z.number(),
  monthlyHours: z.number(),
});

type PayslipRow = Pick<
  Tables<"payslips">,
  | "id"
  | "employee_id"
  | "reference_month"
  | "status"
  | "employee_snapshot"
  | "items"
  | "manual_items"
  | "timesheet_summary"
  | "gross_amount"
  | "deduction_amount"
  | "net_amount"
  | "inss_base"
  | "irrf_base"
  | "fgts_base"
  | "fgts_amount"
  | "hour_bank_balance_minutes"
  | "issued_at"
  | "issued_by_name"
  | "updated_at"
>;

function toPayslip(row: PayslipRow): Payslip | null {
  const employee = employeeSnapshotSchema.safeParse(row.employee_snapshot);
  const items = storedPayslipItemsSchema.safeParse(row.items);
  const manualItems = storedManualItemsSchema.safeParse(row.manual_items);
  const summary = timesheetSummarySchema.safeParse(row.timesheet_summary);
  if (
    !employee.success ||
    !items.success ||
    !manualItems.success ||
    !summary.success
  ) {
    return null;
  }

  return {
    id: row.id as PayslipId,
    employeeId: row.employee_id as EmployeeId,
    monthKey: row.reference_month.slice(0, 7),
    status: row.status,
    employee: employee.data,
    items: items.data,
    manualItems: manualItems.data,
    timesheetSummary: summary.data,
    grossAmount: row.gross_amount,
    deductionAmount: row.deduction_amount,
    netAmount: row.net_amount,
    inssBase: row.inss_base,
    irrfBase: row.irrf_base,
    fgtsBase: row.fgts_base,
    fgtsAmount: row.fgts_amount,
    hourBankBalanceMinutes: row.hour_bank_balance_minutes,
    issuedAt: row.issued_at,
    issuedByName: row.issued_by_name,
    updatedAt: row.updated_at,
  };
}

async function readPayrollSettings(
  organizationId: OrganizationId,
): Promise<PayrollSettings | null> {
  const supabase = await createClient();
  const { data: existingRow, error } = await supabase
    .from("payroll_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return null;

  const row =
    existingRow ??
    (
      await supabase
        .from("payroll_settings")
        .insert({ organization_id: organizationId })
        .select("*")
        .single()
    ).data;

  if (!row) return null;

  const inssBrackets = storedInssBracketsSchema.safeParse(row.inss_brackets);
  const irrfBrackets = storedIrrfBracketsSchema.safeParse(row.irrf_brackets);
  if (!inssBrackets.success || !irrfBrackets.success) return null;

  return {
    inssBrackets: inssBrackets.data,
    irrfBrackets: irrfBrackets.data,
    irrfDependentDeduction: row.irrf_dependent_deduction,
    irrfSimplifiedDeduction: row.irrf_simplified_deduction,
    irrfExemptUpTo: row.irrf_exempt_up_to,
    irrfReductionUpTo: row.irrf_reduction_up_to,
    irrfReductionConstant: row.irrf_reduction_constant,
    irrfReductionFactor: row.irrf_reduction_factor,
    overtimeRate: row.overtime_rate,
    restDayOvertimeRate: row.rest_day_overtime_rate,
    nightShiftRate: row.night_shift_rate,
    transportVoucherRate: row.transport_voucher_rate,
    updatedAt: row.updated_at,
  };
}

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

  if (error) return actionFailure("Não foi possível salvar as tabelas.");
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
      .eq("reference_month", monthStart),
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
  const { data: existingRow, error: existingError } = await supabase
    .from("payslips")
    .select(PAYSLIP_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("reference_month", getMonthStart(monthKey))
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
  const snapshot: PayslipEmployeeSnapshot = {
    name: employee.name,
    cpf: employee.cpf,
    pis: employee.pis,
    jobTitle: employee.jobTitle,
    cbo: employee.cbo,
    admissionDate: employee.admissionDate,
    salary: employee.salary,
    employmentType: employee.employmentType,
    overtimePolicy: employee.overtimePolicy,
    dependents: employee.dependents,
  };

  const { error } = await supabase.from("payslips").upsert(
    {
      organization_id: organizationId,
      employee_id: employeeId,
      reference_month: getMonthStart(monthKey),
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
    },
    { onConflict: "employee_id,reference_month" },
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
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payslips")
    .update({ status })
    .eq("id", payslipId)
    .eq("organization_id", organizationId);

  if (error) {
    return actionFailure(PAYSLIP_ERROR_MESSAGES[error.code] ?? fallbackMessage);
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

  return setPayslipStatus(
    organizationId,
    payslipId,
    "issued",
    "Não foi possível emitir o holerite.",
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
