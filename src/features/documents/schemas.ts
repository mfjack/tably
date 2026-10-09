import * as z from "zod";
import { DOCUMENT_KIND_VALUES } from "./document-kinds";

export const documentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do documento.")
    .max(120, "Nome muito longo."),
  kind: z.enum(DOCUMENT_KIND_VALUES, { error: "Escolha o tipo." }),
  expiresOn: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida.")
    .optional(),
  notes: z.string().trim().max(500, "Observação muito longa.").optional(),
});

export type DocumentFormInput = z.infer<typeof documentFormSchema>;
