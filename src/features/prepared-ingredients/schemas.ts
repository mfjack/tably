import * as z from "zod";
import { recipeItemSchema } from "@/features/products/schemas";

export const preparedRecipeFormSchema = z
  .object({
    isPrepared: z.boolean(),
    yieldQuantity: z
      .number()
      .positive("O rendimento precisa ser maior que zero.")
      .optional(),
    recipe: z.array(recipeItemSchema),
    steps: z
      .array(
        z.object({
          text: z.string().trim().max(500, "Passo muito longo."),
        }),
      )
      .max(30, "No máximo 30 passos."),
  })
  .superRefine((values, context) => {
    if (!values.isPrepared) return;
    if (values.yieldQuantity === undefined) {
      context.addIssue({
        code: "custom",
        message: "Informe quanto uma receita rende.",
        path: ["yieldQuantity"],
      });
    }
    if (values.recipe.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Adicione pelo menos um insumo à receita.",
        path: ["recipe"],
      });
    }
    const seenIngredientIds = new Set<string>();
    values.recipe.forEach((recipeItem, index) => {
      if (seenIngredientIds.has(recipeItem.ingredientId)) {
        context.addIssue({
          code: "custom",
          message: "Esse insumo já está na receita.",
          path: ["recipe", index, "ingredientId"],
        });
      }
      seenIngredientIds.add(recipeItem.ingredientId);
    });
  });

export type PreparedRecipeFormInput = z.infer<typeof preparedRecipeFormSchema>;

export type ProductionResult = {
  producedQuantity: number;
  totalCost: number;
};
