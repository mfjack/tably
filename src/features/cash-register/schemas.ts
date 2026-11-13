import * as z from "zod";

export const openCashSessionSchema = z.object({
  openingAmount: z.number().min(0, "Não pode ser negativo.").optional(),
});

export const cashMovementSchema = z.object({
  amount: z
    .number({ error: "Informe o valor." })
    .positive("Informe um valor maior que zero."),
  note: z.string().trim().max(200, "Motivo muito longo."),
});

export const cashWithdrawalSchema = cashMovementSchema.extend({
  note: z
    .string()
    .trim()
    .min(1, "Informe o motivo da retirada.")
    .max(200, "Motivo muito longo."),
});

export const CASH_MOVEMENT_SCHEMAS = {
  withdrawal: cashWithdrawalSchema,
  supply: cashMovementSchema,
} as const;

export const closeCashSessionSchema = z.object({
  countedCash: z
    .number({ error: "Informe quanto tem na gaveta." })
    .min(0, "Não pode ser negativo."),
  note: z.string().trim().max(500, "Observação muito longa."),
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
