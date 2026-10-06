import * as z from "zod";
import { fromSelectFieldValue } from "@/lib/optional-select-value";

export const productAddonFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do adicional.")
      .max(60, "Nome muito longo."),
    price: z
      .number({ error: "Informe o preço." })
      .min(0, "Não pode ser negativo."),
    isActive: z.boolean(),
    ingredientId: z.string().optional(),
    ingredientQuantity: z
      .number()
      .positive("A quantidade precisa ser maior que zero.")
      .optional(),
  })
  .superRefine((values, context) => {
    if (
      fromSelectFieldValue(values.ingredientId) &&
      values.ingredientQuantity === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Informe quanto do insumo é usado.",
        path: ["ingredientQuantity"],
      });
    }
  });

export type ProductAddonFormInput = z.infer<typeof productAddonFormSchema>;
