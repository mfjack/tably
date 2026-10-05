import type {
  EmployeeId,
  EmployeeStatus,
  EmploymentType,
  OvertimePolicy,
} from "@/features/employees/types";
import type { TimesheetSummary } from "@/features/time-clock/timesheet";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";
import type { VacationEntitlement } from "./vacation-entitlement";

export type PayslipId = Brand<string, "PayslipId">;

export type PayslipStatus = Database["public"]["Enums"]["payslip_status"];

export type PayslipKind = Database["public"]["Enums"]["payslip_kind"];

export type PayslipDetails = {
  startDate?: string;
  endDate?: string;
  days?: number;
  soldDays?: number;
  acquisitionStart?: string;
  acquisitionEnd?: string;
  year?: number;
  months?: number;
  variableAverage?: number;
};

export type InssBracket = { upTo: number; rate: number };

export type IrrfBracket = {
  upTo: number | null;
  rate: number;
  deduction: number;
};

export type PayrollSettings = {
  inssBrackets: InssBracket[];
  irrfBrackets: IrrfBracket[];
  irrfDependentDeduction: number;
  irrfSimplifiedDeduction: number;
  irrfExemptUpTo: number;
  irrfReductionUpTo: number;
  irrfReductionConstant: number;
  irrfReductionFactor: number;
  overtimeRate: number;
  restDayOvertimeRate: number;
  nightShiftRate: number;
  transportVoucherRate: number;
  salaryPayment: SalaryPaymentSchedule;
  updatedAt: string | null;
};

export type SalaryPaymentRule =
  Database["public"]["Enums"]["salary_payment_rule"];

export type SalaryPaymentSchedule = {
  rule: SalaryPaymentRule;
  day: number | null;
  isNextMonth: boolean;
};

export type PayslipItemKind = "earning" | "deduction";

export type PayslipItem = {
  code: string;
  description: string;
  reference: string;
  kind: PayslipItemKind;
  amount: number;
};

export type ManualPayslipItem = {
  id: string;
  description: string;
  kind: PayslipItemKind;
  amount: number;
  isTaxable: boolean;
};

export type PayslipEmployeeSnapshot = {
  name: string;
  cpf: string;
  pis: string | null;
  jobTitle: string;
  cbo?: string | null;
  admissionDate: string;
  salary: number;
  employmentType: EmploymentType;
  overtimePolicy: OvertimePolicy;
  dependents: number;
};

export type PayslipTotals = {
  items: PayslipItem[];
  grossAmount: number;
  deductionAmount: number;
  netAmount: number;
  inssBase: number;
  irrfBase: number;
  fgtsBase: number;
  fgtsAmount: number;
  hourBankBalanceMinutes: number;
};

export type Payslip = PayslipTotals & {
  id: PayslipId;
  employeeId: EmployeeId;
  monthKey: string;
  kind: PayslipKind;
  details: PayslipDetails;
  paymentDueDate: string | null;
  status: PayslipStatus;
  employee: PayslipEmployeeSnapshot;
  manualItems: ManualPayslipItem[];
  timesheetSummary: TimesheetSummary;
  issuedAt: string | null;
  issuedByName: string | null;
  updatedAt: string;
};

export type PayrollRow = {
  employeeId: EmployeeId;
  employeeName: string;
  jobTitle: string;
  status: EmployeeStatus;
  payslip: Payslip | null;
};

export type PayrollMonth = {
  monthKey: string;
  rows: PayrollRow[];
};

export type VacationEmployee = {
  employeeId: EmployeeId;
  name: string;
  jobTitle: string;
  admissionDate: string;
  entitlement: VacationEntitlement;
};

export type VacationsOverview = {
  today: string;
  vacations: Payslip[];
  employees: VacationEmployee[];
};

export type ThirteenthRow = {
  employeeId: EmployeeId;
  name: string;
  jobTitle: string;
  months: number;
  first: Payslip | null;
  second: Payslip | null;
};

export type ThirteenthYear = {
  year: number;
  rows: ThirteenthRow[];
};
