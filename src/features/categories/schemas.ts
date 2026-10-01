import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "Nome muito longo."),
  isOnMenu: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
