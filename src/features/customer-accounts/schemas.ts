import * as z from "zod";
import { RECEIVABLE_PAYMENT_METHOD_VALUES } from "@/features/orders/payment-methods";

export const customerAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(80, "Nome muito longo."),
  phone: z
    .string()
    .refine(
      (phone) => phone === "" || /^\d{10,11}$/.test(phone),
      "Telefone incompleto.",
    ),
  creditLimit: z
    .number()
    .positive("O limite deve ser maior que zero.")
    .optional(),
  note: z.string().trim().max(300, "Observação muito longa."),
  isActive: z.boolean(),
});

export function createAccountPaymentSchema(balance: number) {
  return z.object({
    amount: z
      .number({ error: "Informe o valor recebido." })
      .positive("O valor deve ser maior que zero.")
      .max(balance, "O valor é maior que o saldo devedor."),
    method: z.enum(RECEIVABLE_PAYMENT_METHOD_VALUES, {
      error: "Escolha a forma de pagamento.",
    }),
    note: z.string().trim().max(300, "Observação muito longa."),
  });
}

export type CustomerAccountInput = z.infer<typeof customerAccountSchema>;
export type AccountPaymentInput = z.infer<
  ReturnType<typeof createAccountPaymentSchema>
>;
