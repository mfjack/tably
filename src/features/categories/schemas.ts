import { z } from "zod";

export const CATEGORY_MENU_GROUP_VALUES = ["drinks", "food", "none"] as const;

export type CategoryMenuGroupValue =
  (typeof CATEGORY_MENU_GROUP_VALUES)[number];

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "Nome muito longo."),
  menuGroup: z.enum(CATEGORY_MENU_GROUP_VALUES),
  isMenuHighlighted: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
