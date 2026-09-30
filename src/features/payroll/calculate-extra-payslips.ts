import { differenceInCalendarDays, getDaysInMonth, parseISO } from "date-fns";
import type { Employee } from "@/features/employees/types";
import { formatPercent } from "@/lib/format";
import { calculateInss, calculateIrrf } from "./calculate-payslip";
import type { PayrollSettings, PayslipItem, PayslipTotals } from "./types";

const COMMERCIAL_MONTH_DAYS = 30;
const MONTHS_PER_YEAR = 12;
const MIN_DAYS_FOR_MONTH = 15;
const VACATION_BONUS_FRACTION = 1 / 3;
const THIRTEENTH_ADVANCE_FRACTION = 0.5;
const FGTS_RATES = { clt: 0.08, apprentice: 0.02, intern: 0 } as const;

export const VARIABLE_ITEM_CODES = [
  "overtime",
  "rest_day_overtime",
  "night_shift",
  "variable_rest_pay",
] as const;

type ExtraPayslipEmployee = Pick<
  Employee,
  | "salary"
  | "employmentType"
  | "dependents"
  | "admissionDate"
  | "terminationDate"
>;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumItems(items: readonly PayslipItem[], kind: PayslipItem["kind"]) {
  return roundCurrency(
    items
      .filter((item) => item.kind === kind)
      .reduce((total, item) => total + item.amount, 0),
  );
}

function withAmount(item: PayslipItem): PayslipItem[] {
  const amount = roundCurrency(item.amount);
  return amount > 0 ? [{ ...item, amount }] : [];
}

function calculateTaxes(
  employee: ExtraPayslipEmployee,
  taxableIncome: number,
  settings: PayrollSettings,
  allowsSimplifiedDeduction: boolean,
) {
  const isIntern = employee.employmentType === "intern";
  const inss = isIntern
    ? 0
    : calculateInss(taxableIncome, settings.inssBrackets);
  const legalBase =
    taxableIncome -
    inss -
    employee.dependents * settings.irrfDependentDeduction;
  const irrfBase = roundCurrency(
    Math.max(
      0,
      allowsSimplifiedDeduction
        ? Math.min(legalBase, taxableIncome - settings.irrfSimplifiedDeduction)
        : legalBase,
    ),
  );
  const irrf = calculateIrrf(taxableIncome, irrfBase, settings);
  return { inss, irrf, irrfBase, inssBase: isIntern ? 0 : taxableIncome };
}

function buildTotals(
  items: PayslipItem[],
  fgtsBase: number,
  inssBase: number,
  irrfBase: number,
  employee: ExtraPayslipEmployee,
): PayslipTotals {
  const grossAmount = sumItems(items, "earning");
  const deductionAmount = sumItems(items, "deduction");
  const fgtsRate = FGTS_RATES[employee.employmentType];
  return {
    items,
    grossAmount,
    deductionAmount,
    netAmount: roundCurrency(grossAmount - deductionAmount),
    inssBase,
    irrfBase,
    fgtsBase: fgtsRate > 0 ? fgtsBase : 0,
    fgtsAmount: roundCurrency(fgtsBase * fgtsRate),
    hourBankBalanceMinutes: 0,
  };
}

export function calculateVariableAverage(
  monthlyItems: readonly (readonly PayslipItem[])[],
): number {
  if (monthlyItems.length === 0) return 0;
  const total = monthlyItems.reduce(
    (sum, items) =>
      sum +
      items
        .filter((item) =>
          VARIABLE_ITEM_CODES.some((code) => code === item.code),
        )
        .reduce((itemSum, item) => itemSum + item.amount, 0),
    0,
  );
  return roundCurrency(total / monthlyItems.length);
}

type VacationInput = {
  employee: ExtraPayslipEmployee;
  settings: PayrollSettings;
  days: number;
  soldDays: number;
  variableAverage: number;
};

export function calculateVacationPay({
  employee,
  settings,
  days,
  soldDays,
  variableAverage,
}: VacationInput): PayslipTotals {
  const dailyPay = (employee.salary + variableAverage) / COMMERCIAL_MONTH_DAYS;
  const vacationPay = roundCurrency(dailyPay * days);
  const vacationBonus = roundCurrency(vacationPay * VACATION_BONUS_FRACTION);
  const soldPay = roundCurrency(dailyPay * soldDays);
  const soldBonus = roundCurrency(soldPay * VACATION_BONUS_FRACTION);
  const taxableIncome = vacationPay + vacationBonus;
  const taxes = calculateTaxes(employee, taxableIncome, settings, true);

  const items: PayslipItem[] = [
    ...withAmount({
      code: "vacation",
      description: "Férias",
      reference: `${days} dias`,
      kind: "earning",
      amount: vacationPay,
    }),
    ...withAmount({
      code: "vacation_bonus",
      description: "1/3 constitucional de férias",
      reference: "",
      kind: "earning",
      amount: vacationBonus,
    }),
    ...withAmount({
      code: "vacation_sold",
      description: "Abono pecuniário (férias vendidas)",
      reference: `${soldDays} dias`,
      kind: "earning",
      amount: soldPay,
    }),
    ...withAmount({
      code: "vacation_sold_bonus",
      description: "1/3 do abono pecuniário",
      reference: "",
      kind: "earning",
      amount: soldBonus,
    }),
    ...withAmount({
      code: "inss",
      description: "INSS sobre férias",
      reference:
        taxableIncome > 0 ? formatPercent(taxes.inss / taxableIncome) : "",
      kind: "deduction",
      amount: taxes.inss,
    }),
    ...withAmount({
      code: "irrf",
      description: "IRRF sobre férias",
      reference: formatPercent(taxes.irrf.rate),
      kind: "deduction",
      amount: taxes.irrf.amount,
    }),
  ];

  return buildTotals(
    items,
    taxableIncome,
    taxes.inssBase,
    taxes.irrfBase,
    employee,
  );
}

export function countThirteenthMonths(
  employee: Pick<ExtraPayslipEmployee, "admissionDate" | "terminationDate">,
  year: number,
): number {
  let months = 0;
  for (let month = 0; month < MONTHS_PER_YEAR; month++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-${String(getDaysInMonth(parseISO(monthStart))).padStart(2, "0")}`;
    const start =
      employee.admissionDate > monthStart ? employee.admissionDate : monthStart;
    const end =
      employee.terminationDate && employee.terminationDate < monthEnd
        ? employee.terminationDate
        : monthEnd;
    if (start > end) continue;
    const workedDays =
      differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
    if (workedDays >= MIN_DAYS_FOR_MONTH) months++;
  }
  return months;
}

type ThirteenthInput = {
  employee: ExtraPayslipEmployee;
  settings: PayrollSettings;
  months: number;
  variableAverage: number;
  installment: "first" | "second";
  firstInstallmentAmount: number;
};

export function calculateThirteenth({
  employee,
  settings,
  months,
  variableAverage,
  installment,
  firstInstallmentAmount,
}: ThirteenthInput): PayslipTotals {
  const fullAmount = roundCurrency(
    ((employee.salary + variableAverage) / MONTHS_PER_YEAR) * months,
  );

  if (installment === "first") {
    const advance = roundCurrency(fullAmount * THIRTEENTH_ADVANCE_FRACTION);
    return buildTotals(
      withAmount({
        code: "thirteenth_advance",
        description: "13º salário · 1ª parcela (adiantamento)",
        reference: `${months}/12 avos`,
        kind: "earning",
        amount: advance,
      }),
      advance,
      0,
      0,
      employee,
    );
  }

  const taxes = calculateTaxes(employee, fullAmount, settings, false);
  const items: PayslipItem[] = [
    ...withAmount({
      code: "thirteenth",
      description: "13º salário",
      reference: `${months}/12 avos`,
      kind: "earning",
      amount: fullAmount,
    }),
    ...withAmount({
      code: "thirteenth_advance_discount",
      description: "Adiantamento da 1ª parcela",
      reference: "",
      kind: "deduction",
      amount: firstInstallmentAmount,
    }),
    ...withAmount({
      code: "inss",
      description: "INSS sobre 13º",
      reference: fullAmount > 0 ? formatPercent(taxes.inss / fullAmount) : "",
      kind: "deduction",
      amount: taxes.inss,
    }),
    ...withAmount({
      code: "irrf",
      description: "IRRF sobre 13º",
      reference: formatPercent(taxes.irrf.rate),
      kind: "deduction",
      amount: taxes.irrf.amount,
    }),
  ];

  return buildTotals(
    items,
    Math.max(0, fullAmount - firstInstallmentAmount),
    taxes.inssBase,
    taxes.irrfBase,
    employee,
  );
}
