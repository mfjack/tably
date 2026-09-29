import { z } from "zod";
import { isValidCnpj } from "@/lib/masks";
import { Constants } from "@/lib/supabase/database.types";

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
  isTakeawayEnabled: z.boolean(),
  takeawayFee: z
    .number()
    .min(0, "Não pode ser negativo.")
    .max(100, "Valor muito alto.")
    .optional(),
});

export const organizationModulesSchema = z.object({
  hiddenModules: z.array(z.enum(Constants.public.Enums.app_module)),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type OrganizationSettingsInput = z.infer<
  typeof organizationSettingsSchema
>;
export type OrganizationModulesInput = z.infer<
  typeof organizationModulesSchema
>;
