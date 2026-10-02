import * as z from "zod";

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do fornecedor.")
    .max(100, "Nome muito longo."),
  contactName: z.string().trim().max(80, "Nome muito longo."),
  phone: z
    .string()
    .refine(
      (phone) => phone === "" || /^\d{10,11}$/.test(phone),
      "Telefone incompleto.",
    ),
  suppliedItems: z.string().trim().max(200, "Texto muito longo."),
  purchaseUrl: z.union([
    z.literal(""),
    z
      .url({
        protocol: /^https?$/,
        error: "Link inválido. Comece com https://",
      })
      .max(500, "Link muito longo."),
  ]),
  notes: z.string().trim().max(300, "Observação muito longa."),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
