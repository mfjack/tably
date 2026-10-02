import "server-only";

import * as z from "zod";
import type { Employee, EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  storedInssBracketsSchema,
  storedIrrfBracketsSchema,
  storedManualItemsSchema,
  storedPayslipItemsSchema,
} from "./schemas";
import type {
  PayrollSettings,
  Payslip,
  PayslipEmployeeSnapshot,
  PayslipId,
} from "./types";

export const PAYSLIP_COLUMNS =
  "id, employee_id, reference_month, kind, details, payment_due_date, status, employee_snapshot, items, manual_items, timesheet_summary, gross_amount, deduction_amount, net_amount, inss_base, irrf_base, fgts_base, fgts_amount, hour_bank_balance_minutes, issued_at, issued_by_name, updated_at";

export const PAYSLIP_ERROR_MESSAGES: Readonly<Record<string, string>> = {
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

const payslipDetailsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().optional(),
  soldDays: z.number().optional(),
  acquisitionStart: z.string().optional(),
  acquisitionEnd: z.string().optional(),
  year: z.number().optional(),
  months: z.number().optional(),
  variableAverage: z.number().optional(),
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
  vacationDays: z.number().optional().default(0),
});

export type PayslipRow = Pick<
  Tables<"payslips">,
  | "id"
  | "employee_id"
  | "reference_month"
  | "kind"
  | "details"
  | "payment_due_date"
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

export function toPayslip(row: PayslipRow): Payslip | null {
  const employee = employeeSnapshotSchema.safeParse(row.employee_snapshot);
  const items = storedPayslipItemsSchema.safeParse(row.items);
  const manualItems = storedManualItemsSchema.safeParse(row.manual_items);
  const summary = timesheetSummarySchema.safeParse(row.timesheet_summary);
  const details = payslipDetailsSchema.safeParse(row.details);
  if (
    !employee.success ||
    !items.success ||
    !manualItems.success ||
    !summary.success ||
    !details.success
  ) {
    return null;
  }

  return {
    id: row.id as PayslipId,
    employeeId: row.employee_id as EmployeeId,
    monthKey: row.reference_month.slice(0, 7),
    kind: row.kind,
    details: details.data,
    paymentDueDate: row.payment_due_date,
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

export async function readPayrollSettings(
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

export function toEmployeeSnapshot(
  employee: Employee,
): PayslipEmployeeSnapshot {
  return {
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
}
