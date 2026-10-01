import { z } from "zod";

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
      .max(80, "Nome muito longo."),
    categoryId: z.string().optional(),
    price: z
      .number({ error: "Informe o preço de venda." })
      .min(0, "Não pode ser negativo."),
    isActive: z.boolean(),
    isOnMenu: z.boolean(),
    menuDetail: z.string().trim().max(40, "Detalhe muito longo.").optional(),
    imageUrl: z.string().optional(),
    recipe: z.array(recipeItemSchema),
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
