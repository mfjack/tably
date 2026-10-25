import * as z from "zod";
import { toTitleCase } from "@/lib/title-case";
import { SHELF_LIFE_MODES, STORAGE_CONDITIONS } from "./labels";

const MAX_LABEL_COPIES = 20;

export const foodLabelFormSchema = z
  .object({
    ingredientId: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do item.")
      .max(40, "Nome muito longo.")
      .transform(toTitleCase),
    storage: z.enum(STORAGE_CONDITIONS, { error: "Escolha a conservação." }),
    shelfLifeMode: z.enum(SHELF_LIFE_MODES),
    shelfLifeDays: z
      .number()
      .int("Use um número inteiro.")
      .positive("A validade precisa ser maior que zero.")
      .optional(),
    expiresOn: z.string().optional(),
    responsibleName: z
      .string()
      .trim()
      .min(1, "Informe o responsável.")
      .max(40, "Nome muito longo."),
    copies: z
      .number()
      .int("Use um número inteiro.")
      .min(1, "No mínimo 1.")
      .max(MAX_LABEL_COPIES, `No máximo ${MAX_LABEL_COPIES}.`)
      .optional(),
  })
  .superRefine((values, context) => {
    if (values.shelfLifeMode === "days" && !values.shelfLifeDays) {
      context.addIssue({
        code: "custom",
        message: "Informe em quantos dias vence.",
        path: ["shelfLifeDays"],
      });
    }
    if (values.shelfLifeMode === "date" && !values.expiresOn) {
      context.addIssue({
        code: "custom",
        message: "Escolha a data de validade.",
        path: ["expiresOn"],
      });
    }
  });

export type FoodLabelFormInput = z.infer<typeof foodLabelFormSchema>;

export const labelDefaultsSchema = z.object({
  shelfLifeHours: z.number().int().min(1).max(8760),
  storage: z.enum(STORAGE_CONDITIONS),
});

export type LabelDefaultsInput = z.infer<typeof labelDefaultsSchema>;
