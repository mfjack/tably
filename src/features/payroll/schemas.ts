import * as z from "zod";
import { Constants } from "@/lib/supabase/database.types";
import type {
  InssBracket,
  IrrfBracket,
  ManualPayslipItem,
  PayrollSettings,
} from "./types";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const moneySchema = (message: string) =>
  z.number({ error: message }).min(0, message);

const percentSchema = (message: string) =>
  z.number({ error: message }).min(0, message).max(100, message);

export const monthKeySchema = z.string().regex(MONTH_KEY_PATTERN);

export const payrollSettingsSchema = z
  .object({
    inssBrackets: z
      .array(
        z.object({
          upTo: moneySchema("Informe o limite."),
          ratePercent: percentSchema("Informe a alíquota."),
        }),
      )
      .min(1),
    irrfBrackets: z
      .array(
        z.object({
          upTo: z.number().min(0).optional(),
          ratePercent: percentSchema("Informe a alíquota."),
          deduction: moneySchema("Informe a parcela a deduzir."),
        }),
      )
      .min(1),
    irrfDependentDeduction: moneySchema("Informe o valor."),
    irrfSimplifiedDeduction: moneySchema("Informe o valor."),
    irrfExemptUpTo: moneySchema("Informe o valor."),
    irrfReductionUpTo: moneySchema("Informe o valor."),
    irrfReductionConstant: moneySchema("Informe o valor."),
    irrfReductionFactor: z.number({ error: "Informe o fator." }).min(0),
    overtimePercent: z
      .number({ error: "Informe o percentual." })
      .min(50, "A CLT exige no mínimo 50%."),
    restDayOvertimePercent: z
      .number({ error: "Informe o percentual." })
      .min(100, "A CLT exige no mínimo 100%."),
    nightShiftPercent: z
      .number({ error: "Informe o percentual." })
      .min(20, "A CLT exige no mínimo 20%."),
    transportVoucherPercent: z
      .number({ error: "Informe o percentual." })
      .min(0)
      .max(6, "O desconto máximo é 6%."),
    salaryPaymentRule: z.enum(Constants.public.Enums.salary_payment_rule),
    salaryPaymentDay: z
      .number()
      .int("Use um dia inteiro.")
      .min(1, "Escolha um dia de 1 a 31.")
      .max(31, "Escolha um dia de 1 a 31.")
      .optional(),
    isSalaryPaidNextMonth: z.boolean(),
  })
  .refine(
    (values) =>
      values.salaryPaymentRule !== "fixed_day" ||
      values.salaryPaymentDay !== undefined,
    { message: "Informe o dia do pagamento.", path: ["salaryPaymentDay"] },
  );

export type PayrollSettingsInput = z.infer<typeof payrollSettingsSchema>;

const PERCENT_FACTOR = 100;

function toRate(percent: number): number {
  return Math.round((percent / PERCENT_FACTOR) * 1e6) / 1e6;
}

function toPercent(rate: number): number {
  return Math.round(rate * PERCENT_FACTOR * 1e4) / 1e4;
}

export function toPayrollSettingsInput(
  settings: PayrollSettings,
): PayrollSettingsInput {
  return {
    inssBrackets: settings.inssBrackets.map((bracket) => ({
      upTo: bracket.upTo,
      ratePercent: toPercent(bracket.rate),
    })),
    irrfBrackets: settings.irrfBrackets.map((bracket) => ({
      upTo: bracket.upTo ?? undefined,
      ratePercent: toPercent(bracket.rate),
      deduction: bracket.deduction,
    })),
    irrfDependentDeduction: settings.irrfDependentDeduction,
    irrfSimplifiedDeduction: settings.irrfSimplifiedDeduction,
    irrfExemptUpTo: settings.irrfExemptUpTo,
    irrfReductionUpTo: settings.irrfReductionUpTo,
    irrfReductionConstant: settings.irrfReductionConstant,
    irrfReductionFactor: settings.irrfReductionFactor,
    overtimePercent: toPercent(settings.overtimeRate),
    restDayOvertimePercent: toPercent(settings.restDayOvertimeRate),
    nightShiftPercent: toPercent(settings.nightShiftRate),
    transportVoucherPercent: toPercent(settings.transportVoucherRate),
    salaryPaymentRule: settings.salaryPayment.rule,
    salaryPaymentDay: settings.salaryPayment.day ?? undefined,
    isSalaryPaidNextMonth: settings.salaryPayment.isNextMonth,
  };
}

export function fromPayrollSettingsInput(input: PayrollSettingsInput) {
  const inssBrackets: InssBracket[] = input.inssBrackets
    .map((bracket) => ({
      upTo: bracket.upTo,
      rate: toRate(bracket.ratePercent),
    }))
    .sort((first, second) => first.upTo - second.upTo);
  const irrfBrackets: IrrfBracket[] = input.irrfBrackets
    .map((bracket) => ({
      upTo: bracket.upTo ?? null,
      rate: toRate(bracket.ratePercent),
      deduction: bracket.deduction,
    }))
    .sort(
      (first, second) =>
        (first.upTo ?? Number.POSITIVE_INFINITY) -
        (second.upTo ?? Number.POSITIVE_INFINITY),
    );
  return {
    inss_brackets: inssBrackets,
    irrf_brackets: irrfBrackets,
    irrf_dependent_deduction: input.irrfDependentDeduction,
    irrf_simplified_deduction: input.irrfSimplifiedDeduction,
    irrf_exempt_up_to: input.irrfExemptUpTo,
    irrf_reduction_up_to: input.irrfReductionUpTo,
    irrf_reduction_constant: input.irrfReductionConstant,
    irrf_reduction_factor: input.irrfReductionFactor,
    overtime_rate: toRate(input.overtimePercent),
    rest_day_overtime_rate: toRate(input.restDayOvertimePercent),
    night_shift_rate: toRate(input.nightShiftPercent),
    transport_voucher_rate: toRate(input.transportVoucherPercent),
    salary_payment_rule: input.salaryPaymentRule,
    salary_payment_day:
      input.salaryPaymentRule === "fixed_day"
        ? (input.salaryPaymentDay ?? null)
        : null,
    is_salary_paid_next_month: input.isSalaryPaidNextMonth,
  };
}

export const manualPayslipItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descreva o lançamento.")
    .max(60, "Descrição muito longa."),
  kind: z.enum(["earning", "deduction"]),
  amount: z.number({ error: "Informe o valor." }).positive("Informe o valor."),
  isTaxable: z.boolean(),
});

export type ManualPayslipItemInput = z.infer<typeof manualPayslipItemSchema>;

export const storedManualItemsSchema = z.array(
  manualPayslipItemSchema.extend({ id: z.string() }),
) satisfies z.ZodType<ManualPayslipItem[]>;

export const storedInssBracketsSchema = z.array(
  z.object({ upTo: z.number(), rate: z.number() }),
);

export const storedIrrfBracketsSchema = z.array(
  z.object({
    upTo: z.number().nullable(),
    rate: z.number(),
    deduction: z.number(),
  }),
);

export const storedPayslipItemsSchema = z.array(
  z.object({
    code: z.string(),
    description: z.string(),
    reference: z.string(),
    kind: z.enum(["earning", "deduction"]),
    amount: z.number(),
  }),
);

const MIN_VACATION_DAYS = 5;
const MAX_VACATION_DAYS = 30;
export const SOLD_VACATION_DAYS = 10;

export const vacationSchema = z
  .object({
    employeeId: z.string().min(1, "Escolha o funcionário."),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o primeiro dia de férias."),
    days: z
      .number({ error: "Informe os dias de férias." })
      .int()
      .min(MIN_VACATION_DAYS, `No mínimo ${MIN_VACATION_DAYS} dias.`)
      .max(MAX_VACATION_DAYS, `No máximo ${MAX_VACATION_DAYS} dias.`),
    sellsDays: z.boolean(),
  })
  .refine(
    (vacation) =>
      !vacation.sellsDays ||
      vacation.days <= MAX_VACATION_DAYS - SOLD_VACATION_DAYS,
    {
      message: `Vendendo ${SOLD_VACATION_DAYS} dias, sobram no máximo ${MAX_VACATION_DAYS - SOLD_VACATION_DAYS} de descanso.`,
      path: ["days"],
    },
  );

export type VacationInput = z.infer<typeof vacationSchema>;

export const THIRTEENTH_INSTALLMENTS = ["first", "second"] as const;

export type ThirteenthInstallment = (typeof THIRTEENTH_INSTALLMENTS)[number];
