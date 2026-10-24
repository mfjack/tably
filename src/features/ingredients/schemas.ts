import * as z from "zod";
import { toTitleCase } from "@/lib/title-case";
import { MEASURE_UNIT_VALUES } from "./measure-units";
import { getPurchaseCost } from "./stock-cost";

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
      .max(80, "Nome muito longo.")
      .transform(toTitleCase),
    unit: z.enum(MEASURE_UNIT_VALUES, { error: "Escolha a unidade." }),
    quantity: optionalAmountSchema,
    totalCost: optionalAmountSchema,
    freightCost: optionalAmountSchema,
    minimumStock: optionalAmountSchema,
    currentStock: optionalAmountSchema,
    currentStockCost: optionalAmountSchema,
    supplierId: z.string().optional(),
    expiresAt: optionalDateSchema,
    paymentDueDate: optionalDateSchema,
  })
  .refine(
    (values) =>
      (values.quantity ?? 0) > 0 ||
      getPurchaseCost(values.totalCost, values.freightCost) === 0,
    { message: "Informe a quantidade comprada.", path: ["quantity"] },
  )
  .refine(
    (values) =>
      values.currentStockCost === undefined || (values.currentStock ?? 0) > 0,
    { message: "Informe o estoque atual.", path: ["currentStock"] },
  );

export const stockEntryFormSchema = z.object({
  quantity: z
    .number({ error: "Informe a quantidade." })
    .positive("A quantidade precisa ser maior que zero."),
  totalCost: z
    .number({ error: "Informe o valor pago." })
    .min(0, "Não pode ser negativo."),
  freightCost: optionalAmountSchema,
  supplierId: z.string().optional(),
  expiresAt: optionalDateSchema,
  paymentDueDate: optionalDateSchema,
});

export type IngredientFormInput = z.infer<typeof ingredientFormSchema>;
export type StockEntryFormInput = z.infer<typeof stockEntryFormSchema>;
