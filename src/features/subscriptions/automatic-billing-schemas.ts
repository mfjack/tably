import * as z from "zod";
import { ASAAS_BILLING_TYPES } from "@/lib/asaas/types";
import { isValidCnpj, isValidCpf } from "@/lib/masks";

export const automaticBillingSchema = z.object({
  billingType: z.enum(ASAAS_BILLING_TYPES, {
    error: "Escolha a forma de pagamento.",
  }),
  taxId: z
    .string({ error: "Informe o CPF ou CNPJ." })
    .refine(
      (taxId) => isValidCpf(taxId) || isValidCnpj(taxId),
      "CPF ou CNPJ inválido.",
    ),
});

export type AutomaticBillingInput = z.infer<typeof automaticBillingSchema>;
