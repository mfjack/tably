import type { Employee } from "@/features/employees/types";
import {
  formatMinutes,
  getMonthEnd,
  getMonthStart,
  MINUTES_PER_HOUR,
} from "@/features/time-clock/time-utils";
import type { TimesheetSummary } from "@/features/time-clock/timesheet";
import { formatPercent } from "@/lib/format";
import type {
  InssBracket,
  IrrfBracket,
  ManualPayslipItem,
  PayrollSettings,
  PayslipItem,
  PayslipTotals,
} from "./types";

const COMMERCIAL_MONTH_DAYS = 30;
const NIGHT_HOUR_IN_MINUTES = 52.5;
const FGTS_RATES = { clt: 0.08, apprentice: 0.02, intern: 0 } as const;

type CalculatePayslipInput = {
  employee: Pick<
    Employee,
    | "salary"
    | "admissionDate"
    | "terminationDate"
    | "employmentType"
    | "overtimePolicy"
    | "dependents"
    | "hasTransportVoucher"
  >;
  monthKey: string;
  summary: TimesheetSummary;
  settings: PayrollSettings;
  manualItems: readonly ManualPayslipItem[];
  previousHourBankMinutes: number;
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function getPaidDays(
  employee: CalculatePayslipInput["employee"],
  monthKey: string,
): number {
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const start =
    employee.admissionDate > monthStart ? employee.admissionDate : monthStart;
  const end =
    employee.terminationDate && employee.terminationDate < monthEnd
      ? employee.terminationDate
      : monthEnd;

  if (start > end) return 0;

  const startDay = getDayOfMonth(start);
  const endDay =
    end === monthEnd
      ? COMMERCIAL_MONTH_DAYS
      : Math.min(getDayOfMonth(end), COMMERCIAL_MONTH_DAYS);
  return Math.max(0, endDay - startDay + 1);
}

export function calculateInss(
  base: number,
  brackets: readonly InssBracket[],
): number {
  let previousLimit = 0;
  let total = 0;
  for (const bracket of brackets) {
    const portion = Math.min(base, bracket.upTo) - previousLimit;
    if (portion <= 0) break;
    total += portion * bracket.rate;
    previousLimit = bracket.upTo;
  }
  return roundCurrency(total);
}

function findIrrfBracket(base: number, brackets: readonly IrrfBracket[]) {
  return (
    brackets.find((bracket) => bracket.upTo === null || base <= bracket.upTo) ??
    brackets[brackets.length - 1]
  );
}

export function calculateIrrf(
  taxableIncome: number,
  base: number,
  settings: PayrollSettings,
): { amount: number; rate: number } {
  const bracket = findIrrfBracket(base, settings.irrfBrackets);
  if (!bracket || base <= 0) return { amount: 0, rate: 0 };

  const tax = Math.max(0, base * bracket.rate - bracket.deduction);
  if (taxableIncome <= settings.irrfExemptUpTo) {
    return { amount: 0, rate: bracket.rate };
  }
  if (taxableIncome <= settings.irrfReductionUpTo) {
    const reduction = Math.max(
      0,
      settings.irrfReductionConstant -
        settings.irrfReductionFactor * taxableIncome,
    );
    return {
      amount: roundCurrency(Math.max(0, tax - reduction)),
      rate: bracket.rate,
    };
  }
  return { amount: roundCurrency(tax), rate: bracket.rate };
}

function toHours(minutes: number): number {
  return minutes / MINUTES_PER_HOUR;
}

export function calculatePayslip({
  employee,
  monthKey,
  summary,
  settings,
  manualItems,
  previousHourBankMinutes,
}: CalculatePayslipInput): PayslipTotals {
  const items: PayslipItem[] = [];
  const taxableEarnings: number[] = [];
  const baseReductions: number[] = [];
  const isHourBank = employee.overtimePolicy === "hour_bank";
  const paidDays = getPaidDays(employee, monthKey);
  const dailySalary = employee.salary / COMMERCIAL_MONTH_DAYS;
  const hourlyRate = employee.salary / summary.monthlyHours;
  const baseSalary = roundCurrency(dailySalary * paidDays);

  function addItem(
    item: Omit<PayslipItem, "amount"> & { amount: number },
    options: { isTaxable?: boolean; reducesBase?: boolean } = {},
  ) {
    const amount = roundCurrency(item.amount);
    if (amount <= 0) return;
    items.push({ ...item, amount });
    if (options.isTaxable) taxableEarnings.push(amount);
    if (options.reducesBase) baseReductions.push(amount);
  }

  addItem(
    {
      code: "salary",
      description: "Salário base",
      reference: `${paidDays} dias`,
      kind: "earning",
      amount: baseSalary,
    },
    { isTaxable: true },
  );

  let variableEarnings = 0;

  if (!isHourBank) {
    const overtimeAmount = roundCurrency(
      hourlyRate *
        (1 + settings.overtimeRate) *
        toHours(summary.overtimeMinutes),
    );
    const restDayAmount = roundCurrency(
      hourlyRate *
        (1 + settings.restDayOvertimeRate) *
        toHours(summary.restDayWorkedMinutes),
    );
    addItem(
      {
        code: "overtime",
        description: `Horas extras ${formatPercent(settings.overtimeRate)}`,
        reference: formatMinutes(summary.overtimeMinutes),
        kind: "earning",
        amount: overtimeAmount,
      },
      { isTaxable: true },
    );
    addItem(
      {
        code: "rest_day_overtime",
        description: `Horas extras ${formatPercent(settings.restDayOvertimeRate)} (descanso e feriado)`,
        reference: formatMinutes(summary.restDayWorkedMinutes),
        kind: "earning",
        amount: restDayAmount,
      },
      { isTaxable: true },
    );
    variableEarnings += overtimeAmount + restDayAmount;
  }

  const nightAmount = roundCurrency(
    hourlyRate *
      settings.nightShiftRate *
      (summary.nightMinutes / NIGHT_HOUR_IN_MINUTES),
  );
  addItem(
    {
      code: "night_shift",
      description: `Adicional noturno ${formatPercent(settings.nightShiftRate)}`,
      reference: formatMinutes(summary.nightMinutes),
      kind: "earning",
      amount: nightAmount,
    },
    { isTaxable: true },
  );
  variableEarnings += nightAmount;

  if (summary.businessDays > 0) {
    addItem(
      {
        code: "variable_rest_pay",
        description: "DSR sobre horas extras e adicional",
        reference: `${summary.restDays}/${summary.businessDays}`,
        kind: "earning",
        amount: (variableEarnings / summary.businessDays) * summary.restDays,
      },
      { isTaxable: true },
    );
  }

  addItem({
    code: "break_suppressed",
    description: "Intervalo não concedido (indenizatório)",
    reference: formatMinutes(summary.breakShortfallMinutes),
    kind: "earning",
    amount:
      hourlyRate *
      (1 + settings.overtimeRate) *
      toHours(summary.breakShortfallMinutes),
  });

  for (const manualItem of manualItems) {
    if (manualItem.kind === "earning") {
      addItem(
        {
          code: `manual_${manualItem.id}`,
          description: manualItem.description,
          reference: "",
          kind: "earning",
          amount: manualItem.amount,
        },
        { isTaxable: manualItem.isTaxable },
      );
    }
  }

  if (!isHourBank) {
    addItem(
      {
        code: "absences",
        description: "Faltas não justificadas",
        reference: `${summary.absenceDays} ${summary.absenceDays === 1 ? "dia" : "dias"}`,
        kind: "deduction",
        amount: dailySalary * summary.absenceDays,
      },
      { reducesBase: true },
    );
    addItem(
      {
        code: "lost_rest_pay",
        description: "DSR perdido por falta",
        reference: `${summary.lostRestDays} ${summary.lostRestDays === 1 ? "dia" : "dias"}`,
        kind: "deduction",
        amount: dailySalary * summary.lostRestDays,
      },
      { reducesBase: true },
    );
    addItem(
      {
        code: "shortfall",
        description: "Atrasos e saídas antecipadas",
        reference: formatMinutes(summary.shortfallMinutes),
        kind: "deduction",
        amount: hourlyRate * toHours(summary.shortfallMinutes),
      },
      { reducesBase: true },
    );
  }

  const sum = (values: readonly number[]) =>
    values.reduce((total, value) => total + value, 0);
  const taxableIncome = roundCurrency(
    Math.max(0, sum(taxableEarnings) - sum(baseReductions)),
  );
  const isIntern = employee.employmentType === "intern";
  const inssBase = isIntern ? 0 : taxableIncome;
  const inssAmount = isIntern
    ? 0
    : calculateInss(inssBase, settings.inssBrackets);

  addItem({
    code: "inss",
    description: "INSS",
    reference: inssBase > 0 ? formatPercent(inssAmount / inssBase) : "",
    kind: "deduction",
    amount: inssAmount,
  });

  const legalIrrfBase =
    taxableIncome -
    inssAmount -
    employee.dependents * settings.irrfDependentDeduction;
  const simplifiedIrrfBase = taxableIncome - settings.irrfSimplifiedDeduction;
  const irrfBase = roundCurrency(
    Math.max(0, Math.min(legalIrrfBase, simplifiedIrrfBase)),
  );
  const irrf = calculateIrrf(taxableIncome, irrfBase, settings);

  addItem({
    code: "irrf",
    description: "IRRF",
    reference: formatPercent(irrf.rate),
    kind: "deduction",
    amount: irrf.amount,
  });

  if (employee.hasTransportVoucher) {
    addItem({
      code: "transport_voucher",
      description: "Vale-transporte",
      reference: formatPercent(settings.transportVoucherRate),
      kind: "deduction",
      amount: baseSalary * settings.transportVoucherRate,
    });
  }

  for (const manualItem of manualItems) {
    if (manualItem.kind === "deduction") {
      addItem({
        code: `manual_${manualItem.id}`,
        description: manualItem.description,
        reference: "",
        kind: "deduction",
        amount: manualItem.amount,
      });
    }
  }

  const grossAmount = roundCurrency(
    sum(
      items
        .filter((item) => item.kind === "earning")
        .map((item) => item.amount),
    ),
  );
  const deductionAmount = roundCurrency(
    sum(
      items
        .filter((item) => item.kind === "deduction")
        .map((item) => item.amount),
    ),
  );
  const fgtsBase = FGTS_RATES[employee.employmentType] > 0 ? taxableIncome : 0;

  return {
    items,
    grossAmount,
    deductionAmount,
    netAmount: roundCurrency(grossAmount - deductionAmount),
    inssBase,
    irrfBase,
    fgtsBase,
    fgtsAmount: roundCurrency(fgtsBase * FGTS_RATES[employee.employmentType]),
    hourBankBalanceMinutes: isHourBank
      ? previousHourBankMinutes + summary.balanceMinutes
      : 0,
  };
}
