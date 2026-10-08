import * as z from "zod";
import { MAX_SERVICE_FEE_PERCENT } from "@/features/orders/order-adjustments";
import { RECEIVABLE_PAYMENT_METHOD_VALUES } from "@/features/orders/payment-methods";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
} from "@/features/subscriptions/plans";
import { isValidCnpj } from "@/lib/masks";
import { Constants } from "@/lib/supabase/database.types";

const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome do estabelecimento.")
  .max(80, "Nome muito longo.");

export const createOrganizationSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS).optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  name: organizationNameSchema,
  hasAcceptedTerms: z.boolean().refine((isAccepted) => isAccepted, {
    message: "Para continuar, aceite os termos de uso.",
  }),
});

export const organizationSettingsSchema = z.object({
  name: organizationNameSchema,
  taxId: z
    .string()
    .refine((taxId) => taxId === "" || isValidCnpj(taxId), "CNPJ inválido."),
  phone: z
    .string()
    .refine(
      (phone) => phone === "" || /^\d{10,11}$/.test(phone),
      "Telefone incompleto.",
    ),
  address: z.string().trim().max(200, "Endereço muito longo."),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type OrganizationSettingsInput = z.infer<
  typeof organizationSettingsSchema
>;

export const checkoutSettingsSchema = z
  .object({
    isTakeawayEnabled: z.boolean(),
    takeawayFee: z
      .number()
      .min(0, "Não pode ser negativo.")
      .max(100, "Valor muito alto.")
      .optional(),
    isServiceFeeEnabled: z.boolean(),
    serviceFeePercent: z
      .number()
      .positive("Informe um valor maior que zero.")
      .max(MAX_SERVICE_FEE_PERCENT, `No máximo ${MAX_SERVICE_FEE_PERCENT}%.`)
      .optional(),
    isDiscountEnabled: z.boolean(),
    isSplitBillEnabled: z.boolean(),
    isOrderTabsEnabled: z.boolean(),
    isProductAddonsEnabled: z.boolean(),
    kitchenLateMinutes: z
      .number({ error: "Informe os minutos." })
      .int("Use minutos inteiros.")
      .min(1, "No mínimo 1 minuto.")
      .max(240, "No máximo 240 minutos."),
    isCustomerAccountPaymentEnabled: z.boolean(),
    acceptedPaymentMethods: z
      .array(z.enum(RECEIVABLE_PAYMENT_METHOD_VALUES))
      .min(1, "Escolha pelo menos uma forma de pagamento."),
  })
  .superRefine((values, context) => {
    if (values.isServiceFeeEnabled && values.serviceFeePercent === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe a porcentagem da taxa.",
        path: ["serviceFeePercent"],
      });
    }
  });

export type CheckoutSettingsInput = z.infer<typeof checkoutSettingsSchema>;

const feePercentSchema = z
  .number()
  .min(0, "Não pode ser negativo.")
  .max(100, "No máximo 100%.")
  .optional();

export const organizationModulesSchema = z.object({
  hiddenModules: z.array(z.enum(Constants.public.Enums.app_module)),
});

export type OrganizationModulesInput = z.infer<
  typeof organizationModulesSchema
>;

export const paymentFeesSchema = z.object({
  creditCardFeePercent: feePercentSchema,
  debitCardFeePercent: feePercentSchema,
  pixFeePercent: feePercentSchema,
  isPassedOnToCustomer: z.boolean(),
});

export type PaymentFeesInput = z.infer<typeof paymentFeesSchema>;
