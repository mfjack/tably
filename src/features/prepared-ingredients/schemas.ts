import * as z from "zod";
import {
  ingredientNameSchema,
  measureUnitSchema,
} from "@/features/ingredients/schemas";
import { recipeItemSchema } from "@/features/products/schemas";

const preparedRecipeShape = {
  yieldQuantity: z
    .number({ error: "Informe quanto uma receita rende." })
    .positive("O rendimento precisa ser maior que zero."),
  recipe: z
    .array(recipeItemSchema)
    .min(1, "Adicione pelo menos um insumo à receita."),
  steps: z
    .array(
      z.object({
        text: z.string().trim().max(500, "Passo muito longo."),
      }),
    )
    .max(30, "No máximo 30 passos."),
};

function refineRepeatedIngredients(
  values: { recipe: z.infer<typeof recipeItemSchema>[] },
  context: z.RefinementCtx,
) {
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
}

const preparedRecipeSchema = z.object(preparedRecipeShape);

export type PreparedRecipeFormInput = z.infer<typeof preparedRecipeSchema>;

export const preparationFormSchema = z
  .object({
    name: ingredientNameSchema,
    unit: measureUnitSchema,
    minimumStock: z.number().min(0, "Não pode ser negativo.").optional(),
    ...preparedRecipeShape,
  })
  .superRefine(refineRepeatedIngredients);

export type PreparationFormInput = z.infer<typeof preparationFormSchema>;

export type ProductionResult = {
  producedQuantity: number;
  totalCost: number;
};
