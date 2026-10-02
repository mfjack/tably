import * as z from "zod";
import { MEASURE_UNIT_VALUES } from "./measure-units";

const optionalDateSchema = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
  .optional();

const optionalAmountSchema = z
  .number()
  .min(0, "Não pode ser negativo.")
  .optional();

export const ingredientFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do insumo.")
      .max(80, "Nome muito longo."),
    brand: z.string().trim().max(60, "Marca muito longa.").optional(),
    unit: z.enum(MEASURE_UNIT_VALUES, { error: "Escolha a unidade." }),
    quantity: optionalAmountSchema,
    totalCost: optionalAmountSchema,
    minimumStock: optionalAmountSchema,
    currentStock: optionalAmountSchema,
    supplierId: z.string().optional(),
    expiresAt: optionalDateSchema,
    paymentDueDate: optionalDateSchema,
  })
  .refine(
    (values) => (values.quantity ?? 0) > 0 || (values.totalCost ?? 0) === 0,
    { message: "Informe a quantidade comprada.", path: ["quantity"] },
  );

export const stockEntryFormSchema = z.object({
  quantity: z
    .number({ error: "Informe a quantidade." })
    .positive("A quantidade precisa ser maior que zero."),
  totalCost: z
    .number({ error: "Informe o valor pago." })
    .min(0, "Não pode ser negativo."),
  supplierId: z.string().optional(),
  expiresAt: optionalDateSchema,
  paymentDueDate: optionalDateSchema,
});

export type IngredientFormInput = z.infer<typeof ingredientFormSchema>;
export type StockEntryFormInput = z.infer<typeof stockEntryFormSchema>;
