import * as z from "zod";

export const LOYALTY_PHONE_PATTERN = /^\d{10,11}$/;
export const MIN_STAMPS_REQUIRED = 2;
export const DEFAULT_STAMPS_REQUIRED = 10;
export const MAX_STAMPS_REQUIRED = 50;
export const MAX_STAMPS_ADJUSTMENT = 50;

const phoneSchema = z
  .string()
  .regex(LOYALTY_PHONE_PATTERN, "Informe o celular com DDD.");

const customerNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do cliente.")
  .max(80, "Nome muito longo.");

export const loyaltySettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    stampsRequired: z
      .number({ error: "Informe quantos selos valem o prêmio." })
      .int("Use um número inteiro.")
      .min(MIN_STAMPS_REQUIRED, `No mínimo ${MIN_STAMPS_REQUIRED} selos.`)
      .max(MAX_STAMPS_REQUIRED, `No máximo ${MAX_STAMPS_REQUIRED} selos.`),
    minimumPurchase: z.number().min(0, "Não pode ser negativo.").optional(),
    rewardDescription: z.string().trim().max(80, "Descrição muito longa."),
  })
  .refine(
    (values) => !values.isEnabled || values.rewardDescription.length > 0,
    { message: "Descreva o prêmio.", path: ["rewardDescription"] },
  );

export const loyaltyCheckoutSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().max(80, "Nome muito longo.").optional(),
});

export const loyaltyCustomerSchema = z.object({
  name: customerNameSchema,
  phone: phoneSchema,
  initialStamps: z
    .number()
    .int("Use um número inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(MAX_STAMPS_REQUIRED, `No máximo ${MAX_STAMPS_REQUIRED} selos.`)
    .optional(),
});

export const loyaltyAdjustmentSchema = z.object({
  stamps: z
    .number({ error: "Informe a quantidade de selos." })
    .int("Use um número inteiro.")
    .min(-MAX_STAMPS_ADJUSTMENT, `No máximo ${MAX_STAMPS_ADJUSTMENT} selos.`)
    .max(MAX_STAMPS_ADJUSTMENT, `No máximo ${MAX_STAMPS_ADJUSTMENT} selos.`)
    .refine((stamps) => stamps !== 0, "Informe a quantidade de selos."),
  note: z.string().trim().min(1, "Explique o motivo.").max(200),
});

export type LoyaltySettingsInput = z.infer<typeof loyaltySettingsSchema>;
export type LoyaltyCheckoutInput = z.infer<typeof loyaltyCheckoutSchema>;
export type LoyaltyCustomerInput = z.infer<typeof loyaltyCustomerSchema>;
export type LoyaltyAdjustmentInput = z.infer<typeof loyaltyAdjustmentSchema>;
