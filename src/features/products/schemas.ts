import * as z from "zod";
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
    isStockTracked: z.boolean(),
    stockQuantity: z
      .number()
      .int("Use um número inteiro.")
      .min(0, "Não pode ser negativo.")
      .optional(),
    minimumStock: z
      .number()
      .int("Use um número inteiro.")
      .min(0, "Não pode ser negativo.")
      .optional(),
    supplierId: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.isStockTracked && values.stockQuantity === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe a quantidade em estoque.",
        path: ["stockQuantity"],
      });
    }

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

export const productStockEntrySchema = z.object({
  quantity: z
    .number({ error: "Informe a quantidade." })
    .int("Use um número inteiro.")
    .positive("A quantidade precisa ser maior que zero."),
  totalCost: z
    .number({ error: "Informe o valor total pago." })
    .positive("Informe o valor total pago."),
  freightCost: z.number().min(0, "Não pode ser negativo.").optional(),
  paymentDate: z
    .string({ error: "Informe a data de pagamento." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de pagamento."),
  minimumStock: z
    .number()
    .int("Use um número inteiro.")
    .min(0, "Não pode ser negativo.")
    .optional(),
  supplierId: z.string().optional(),
});

export type ProductStockEntryInput = z.infer<typeof productStockEntrySchema>;
