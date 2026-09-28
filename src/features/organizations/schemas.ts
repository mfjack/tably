import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do estabelecimento.")
    .max(80, "Nome muito longo."),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
