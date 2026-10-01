import { z } from "zod";
import { MAX_SERVICE_FEE_PERCENT } from "@/features/orders/order-adjustments";
import { isValidCnpj } from "@/lib/masks";

const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome do estabelecimento.")
  .max(80, "Nome muito longo.");

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
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
    isCustomerAccountPaymentEnabled: z.boolean(),
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
