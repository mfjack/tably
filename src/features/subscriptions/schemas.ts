import { z } from "zod";
import { SUBSCRIPTION_PLANS } from "./plans";

export const adminSubscriptionSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS),
  monthlyPrice: z
    .number({ error: "Informe o valor mensal." })
    .min(0, "Não pode ser negativo."),
  trialEndsAt: z.iso.date({ error: "Informe a data." }),
  notes: z.string().trim().max(1000, "Anotação muito longa."),
});

export const subscriptionPaymentSchema = z.object({
  amount: z
    .number({ error: "Informe o valor recebido." })
    .min(0, "Não pode ser negativo."),
  months: z
    .number({ error: "Informe a quantidade de meses." })
    .int("Use um número inteiro.")
    .min(1, "Mínimo de 1 mês.")
    .max(24, "Máximo de 24 meses."),
  note: z.string().trim().max(300, "Observação muito longa."),
});

export type AdminSubscriptionInput = z.infer<typeof adminSubscriptionSchema>;
export type SubscriptionPaymentInput = z.infer<
  typeof subscriptionPaymentSchema
>;
