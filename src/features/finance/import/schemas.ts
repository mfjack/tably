import * as z from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { toTitleCase } from "@/lib/title-case";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_IMPORT_ROWS = 500;

export const financeImportRowSchema = z.object({
  kind: z.enum(Constants.public.Enums.financial_entry_kind),
  description: z
    .string()
    .trim()
    .min(1, "Sem descrição.")
    .max(120, "Descrição muito longa.")
    .transform(toTitleCase),
  amount: z.number({ error: "Valor inválido." }).positive("Valor inválido."),
  dueDate: z.string().regex(DATE_PATTERN, "Vencimento inválido."),
  categoryName: z.string().trim().max(60),
  supplierName: z.string().trim().max(100),
  paidAt: z.union([
    z.literal(""),
    z.string().regex(DATE_PATTERN, "Data de pagamento inválida."),
  ]),
  paidAmount: z.number().positive("Valor pago inválido.").nullable(),
  notes: z.string().trim().max(300, "Observação muito longa."),
});

export const financeImportSchema = z
  .array(financeImportRowSchema)
  .min(1, "A planilha não tem lançamentos.")
  .max(
    MAX_IMPORT_ROWS,
    `Importe no máximo ${MAX_IMPORT_ROWS} lançamentos por vez.`,
  );

export type FinanceImportRow = z.infer<typeof financeImportRowSchema>;
