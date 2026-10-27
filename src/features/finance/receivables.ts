import * as z from "zod";

export const SETTLEMENT_METHODS = ["credit_card", "debit_card", "pix"] as const;

export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const paymentReceivableSchema = z.object({
  saleDate: z.string(),
  method: z.enum(SETTLEMENT_METHODS),
  gross: z.coerce.number(),
  fee: z.coerce.number(),
  net: z.coerce.number(),
  expectedOn: z.string(),
  receivedAmount: z.coerce.number().nullable(),
  confirmedAt: z.string().nullable(),
  confirmedByName: z.string().nullable(),
});

export type PaymentReceivable = z.infer<typeof paymentReceivableSchema>;

export type PaymentReceivables = {
  today: string;
  receivables: PaymentReceivable[];
};

export const paymentSettlementKeySchema = z.object({
  saleDate: z.string().regex(DATE_PATTERN),
  method: z.enum(SETTLEMENT_METHODS),
});

export type PaymentSettlementKey = z.infer<typeof paymentSettlementKeySchema>;

export const paymentSettlementSchema = paymentSettlementKeySchema.extend({
  receivedAmount: z
    .number({ error: "Informe o valor que caiu na conta." })
    .min(0, "Não pode ser negativo."),
});

export type PaymentSettlementInput = z.infer<typeof paymentSettlementSchema>;

export type ReceivablesSummary =
  | { kind: "waiting"; expectedOn: string }
  | { kind: "overdue"; count: number }
  | { kind: "matched" }
  | { kind: "short"; difference: number }
  | { kind: "over"; difference: number };

const CENTS_PER_UNIT = 100;

function toCents(amount: number): number {
  return Math.round(amount * CENTS_PER_UNIT);
}

function getDifferenceInCents(receivable: PaymentReceivable): number {
  return receivable.receivedAmount === null
    ? 0
    : toCents(receivable.receivedAmount) - toCents(receivable.net);
}

export function summarizeReceivables(
  receivables: readonly PaymentReceivable[],
  today: string,
): ReceivablesSummary | null {
  if (receivables.length === 0) return null;

  const pending = receivables.filter(
    (receivable) => receivable.receivedAmount === null,
  );
  const overdueCount = pending.filter(
    (receivable) => receivable.expectedOn < today,
  ).length;
  if (overdueCount > 0) return { kind: "overdue", count: overdueCount };

  const differenceInCents = receivables.reduce(
    (total, receivable) => total + getDifferenceInCents(receivable),
    0,
  );
  const difference = differenceInCents / CENTS_PER_UNIT;
  if (differenceInCents < 0) return { kind: "short", difference };
  if (pending.length > 0) {
    const lastExpectedOn = pending.reduce(
      (latest, receivable) =>
        receivable.expectedOn > latest ? receivable.expectedOn : latest,
      pending[0]?.expectedOn ?? today,
    );
    return { kind: "waiting", expectedOn: lastExpectedOn };
  }
  return differenceInCents > 0
    ? { kind: "over", difference }
    : { kind: "matched" };
}

export function getReceivableKey(receivable: PaymentSettlementKey): string {
  return `${receivable.saleDate}-${receivable.method}`;
}
