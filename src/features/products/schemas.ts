import * as z from "zod";
import { getPurchaseCost } from "@/features/ingredients/stock-cost";
import { toTitleCase } from "@/lib/title-case";

export const recipeItemSchema = z.object({
  ingredientId: z
    .string({ error: "Escolha o insumo." })
    .min(1, "Escolha o insumo."),
  quantity: z
    .number({ error: "Informe a quantidade." })
    .positive("A quantidade precisa ser maior que zero."),
});

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do produto.")
      .max(80, "Nome muito longo.")
      .transform(toTitleCase),
    categoryId: z
      .string({ error: "Escolha a categoria." })
      .min(1, "Escolha a categoria."),
    price: z
      .number({ error: "Informe o preço de venda." })
      .positive("O preço precisa ser maior que zero."),
    isActive: z.boolean(),
    isOnMenu: z.boolean(),
    menuDetail: z.string().trim().max(40, "Detalhe muito longo.").optional(),
    imageUrl: z.string().optional(),
    recipe: z.array(recipeItemSchema),
    addonIds: z.array(z.string()),
  })
  .superRefine((values, context) => {
    const seenIngredientIds = new Set<string>();

    values.recipe.forEach((recipeItem, index) => {
      if (seenIngredientIds.has(recipeItem.ingredientId)) {
        context.addIssue({
          code: "custom",
          message: "Esse insumo já está na ficha técnica.",
          path: ["recipe", index, "ingredientId"],
        });
      }
      seenIngredientIds.add(recipeItem.ingredientId);
    });
  });

export type RecipeItemInput = z.infer<typeof recipeItemSchema>;
export type ProductFormInput = z.infer<typeof productFormSchema>;

const stockCountSchema = z
  .number()
  .int("Use um número inteiro.")
  .min(0, "Não pode ser negativo.");

export const productStockSettingsSchema = z
  .object({
    isStockTracked: z.boolean(),
    quantity: stockCountSchema.optional(),
    minimumStock: stockCountSchema.optional(),
    supplierId: z.string().optional(),
    totalCost: z.number().min(0, "Não pode ser negativo.").optional(),
    paymentDate: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
      .optional(),
  })
  .refine((values) => !values.totalCost || Boolean(values.quantity), {
    message: "Informe a quantidade comprada.",
    path: ["quantity"],
  })
  .refine((values) => !values.totalCost || Boolean(values.paymentDate), {
    message: "Informe a data de pagamento.",
    path: ["paymentDate"],
  });

export type ProductStockSettingsInput = z.infer<
  typeof productStockSettingsSchema
>;

export const productStockEntrySchema = z
  .object({
    quantity: z
      .number({ error: "Informe a quantidade." })
      .int("Use um número inteiro.")
      .positive("A quantidade precisa ser maior que zero."),
    totalCost: z.number().min(0, "Não pode ser negativo.").optional(),
    freightCost: z.number().min(0, "Não pode ser negativo.").optional(),
    paymentDate: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
      .optional(),
    minimumStock: z
      .number()
      .int("Use um número inteiro.")
      .min(0, "Não pode ser negativo.")
      .optional(),
    supplierId: z.string().optional(),
  })
  .refine(
    (values) =>
      !getPurchaseCost(values.totalCost, values.freightCost) ||
      Boolean(values.paymentDate),
    { message: "Informe a data de pagamento.", path: ["paymentDate"] },
  );

export type ProductStockEntryInput = z.infer<typeof productStockEntrySchema>;
