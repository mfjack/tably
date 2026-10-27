import * as z from "zod";
import { MAX_SERVICE_FEE_PERCENT } from "@/features/orders/order-adjustments";
import { RECEIVABLE_PAYMENT_METHOD_VALUES } from "@/features/orders/payment-methods";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLANS,
} from "@/features/subscriptions/plans";
import { isValidCnpj } from "@/lib/masks";
import { Constants } from "@/lib/supabase/database.types";
import { TIME_OF_DAY_PATTERN } from "@/lib/time-of-day";

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

const OPENING_DAY_TIME_FIELDS = [
  { name: "opensAt", label: "Informe quando abre.", isRequired: true },
  { name: "breakStartsAt", label: "Informe quando fecha.", isRequired: false },
  { name: "breakEndsAt", label: "Informe quando reabre.", isRequired: false },
  { name: "closesAt", label: "Informe quando fecha.", isRequired: true },
] as const;

export const openingHoursFormSchema = z.object({
  days: z.array(
    z
      .object({
        weekday: z.number().int().min(1).max(7),
        isOpen: z.boolean(),
        opensAt: z.string(),
        breakStartsAt: z.string(),
        breakEndsAt: z.string(),
        closesAt: z.string(),
      })
      .superRefine((day, context) => {
        if (!day.isOpen) return;
        const hasBreak = Boolean(day.breakStartsAt || day.breakEndsAt);
        const filledTimes: string[] = [];
        for (const field of OPENING_DAY_TIME_FIELDS) {
          const time = day[field.name];
          if (!field.isRequired && !hasBreak) continue;
          if (!TIME_OF_DAY_PATTERN.test(time)) {
            context.addIssue({
              code: "custom",
              path: [field.name],
              message: field.label,
            });
            return;
          }
          const previousTime = filledTimes.at(-1);
          if (previousTime !== undefined && time <= previousTime) {
            context.addIssue({
              code: "custom",
              path: [field.name],
              message: "Precisa ser depois do horário anterior.",
            });
            return;
          }
          filledTimes.push(time);
        }
      }),
  ),
});

export type OpeningHoursFormInput = z.infer<typeof openingHoursFormSchema>;

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
    isMultipleCartsEnabled: z.boolean(),
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

const settlementDaysSchema = z
  .number({ error: "Informe em quantos dias úteis cai." })
  .int("Use um número inteiro.")
  .min(0, "Não pode ser negativo.")
  .max(60, "Use até 60 dias.");

export const paymentFeesSchema = z.object({
  creditCardFeePercent: feePercentSchema,
  debitCardFeePercent: feePercentSchema,
  pixFeePercent: feePercentSchema,
  isPassedOnToCustomer: z.boolean(),
  creditCardSettlementDays: settlementDaysSchema,
  debitCardSettlementDays: settlementDaysSchema,
});

export type PaymentFeesInput = z.infer<typeof paymentFeesSchema>;
