import * as z from "zod";
import { toTitleCase } from "@/lib/title-case";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "Nome muito longo.")
    .transform(toTitleCase),
  isOnMenu: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
