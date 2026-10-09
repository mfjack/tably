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

export const productionFormSchema = z.object({
  batches: z.number().positive("Informe quantas receitas fez.").optional(),
  producedQuantity: z.number().min(0, "Não pode ser negativo.").optional(),
});

export type ProductionFormInput = z.infer<typeof productionFormSchema>;

export type ProductionResult = {
  producedQuantity: number;
  totalCost: number;
};
