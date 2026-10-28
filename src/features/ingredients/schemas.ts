import * as z from "zod";
import { toTitleCase } from "@/lib/title-case";
import { MEASURE_UNIT_VALUES } from "./measure-units";

const optionalDateSchema = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
  .optional();

const optionalAmountSchema = z
  .number()
  .min(0, "Não pode ser negativo.")
  .optional();

const ingredientNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do insumo.")
  .max(80, "Nome muito longo.")
  .transform(toTitleCase);

const measureUnitSchema = z.enum(MEASURE_UNIT_VALUES, {
  error: "Escolha a unidade.",
});

export const ingredientFormSchema = z
  .object({
    name: ingredientNameSchema,
    unit: measureUnitSchema,
    minimumStock: optionalAmountSchema,
    currentStock: optionalAmountSchema,
    currentStockCost: optionalAmountSchema,
    supplierId: z.string().optional(),
    expiresAt: optionalDateSchema,
  })
  .refine(
    (values) =>
      values.currentStockCost === undefined || (values.currentStock ?? 0) > 0,
    { message: "Informe o estoque atual.", path: ["currentStock"] },
  );

const newIngredientSchema = z.object({
  ingredientId: z.string().optional(),
  name: ingredientNameSchema,
  unit: measureUnitSchema,
  quantity: z
    .number({ error: "Informe a quantidade comprada." })
    .positive("Informe a quantidade comprada."),
  totalCost: optionalAmountSchema,
  minimumStock: optionalAmountSchema,
  expiresAt: optionalDateSchema,
});

export const ingredientsCreateFormSchema = z
  .object({
    supplierId: z.string().optional(),
    paymentDueDate: optionalDateSchema,
    ingredients: z
      .array(newIngredientSchema)
      .min(1, "Adicione pelo menos um insumo.")
      .superRefine((ingredients, context) => {
        const seenNames = new Set<string>();
        ingredients.forEach((ingredient, index) => {
          const normalizedName = ingredient.name.toLocaleLowerCase("pt-BR");
          if (!normalizedName) return;
          if (seenNames.has(normalizedName)) {
            context.addIssue({
              code: "custom",
              path: [index, "name"],
              message: "Esse insumo já está na lista.",
            });
          }
          seenNames.add(normalizedName);
        });
      }),
  })
  .refine(
    (values) =>
      Boolean(values.paymentDueDate) ||
      values.ingredients.every((ingredient) => !ingredient.totalCost),
    { message: "Informe a data de pagamento.", path: ["paymentDueDate"] },
  );

export type IngredientFormInput = z.infer<typeof ingredientFormSchema>;
export type IngredientsCreateFormInput = z.infer<
  typeof ingredientsCreateFormSchema
>;
