import * as z from "zod";
import { SHELF_LIFE_UNITS, STORAGE_CONDITIONS } from "./labels";

export const MAX_LABEL_COPIES = 20;

export const foodLabelFormSchema = z.object({
  ingredientId: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do item.")
    .max(40, "Nome muito longo."),
  storage: z.enum(STORAGE_CONDITIONS, { error: "Escolha a conservação." }),
  shelfLifeAmount: z
    .number({ error: "Informe a validade." })
    .int("Use um número inteiro.")
    .positive("A validade precisa ser maior que zero."),
  shelfLifeUnit: z.enum(SHELF_LIFE_UNITS),
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
});

export type FoodLabelFormInput = z.infer<typeof foodLabelFormSchema>;

export const labelDefaultsSchema = z.object({
  shelfLifeHours: z.number().int().min(1).max(8760),
  storage: z.enum(STORAGE_CONDITIONS),
});

export type LabelDefaultsInput = z.infer<typeof labelDefaultsSchema>;
