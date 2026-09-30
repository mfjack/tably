import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INSTALLMENTS = 120;
const MIN_INSTALLMENTS = 2;

const dateSchema = (message: string) => z.string().regex(DATE_PATTERN, message);

const optionalDateSchema = z.union([
  z.literal(""),
  z.string().regex(DATE_PATTERN, "Data inválida."),
]);

const moneySchema = z
  .number({ error: "Informe o valor." })
  .positive("Informe o valor.");

export const ENTRY_REPEAT_OPTIONS = [
  "none",
  "installments",
  "recurring",
] as const;

export type EntryRepeat = (typeof ENTRY_REPEAT_OPTIONS)[number];

export const ENTRY_EDIT_SCOPES = ["single", "following"] as const;

export type EntryEditScope = (typeof ENTRY_EDIT_SCOPES)[number];

export const ENTRY_DELETE_SCOPES = [
  "single",
  "following",
  "installments",
] as const;

export type EntryDeleteScope = (typeof ENTRY_DELETE_SCOPES)[number];

export const ENTRY_LIST_FILTERS = ["open", "paid", "all"] as const;

export type EntryListFilter = (typeof ENTRY_LIST_FILTERS)[number];

export const entrySchema = z
  .object({
    kind: z.enum(Constants.public.Enums.financial_entry_kind),
    description: z
      .string()
      .trim()
      .min(1, "Descreva o lançamento.")
      .max(120, "Descrição muito longa."),
    amount: moneySchema,
    dueDate: dateSchema("Informe o vencimento."),
    categoryId: z.string().optional(),
    supplierId: z.string().optional(),
    accountId: z.string().optional(),
    digitableLine: z
      .string()
      .refine(
        (line) => line === "" || /^\d{47,48}$/.test(line),
        "Código incompleto.",
      ),
    notes: z.string().trim().max(300, "Observação muito longa."),
    repeat: z.enum(ENTRY_REPEAT_OPTIONS),
    installmentCount: z
      .number()
      .int()
      .min(MIN_INSTALLMENTS, `No mínimo ${MIN_INSTALLMENTS} parcelas.`)
      .max(MAX_INSTALLMENTS, `No máximo ${MAX_INSTALLMENTS} parcelas.`)
      .optional(),
    frequency: z.enum(Constants.public.Enums.recurrence_frequency).optional(),
    endDate: optionalDateSchema,
    isPaid: z.boolean(),
    paidAt: optionalDateSchema,
  })
  .refine(
    (entry) => entry.repeat !== "installments" || entry.installmentCount,
    { message: "Informe o número de parcelas.", path: ["installmentCount"] },
  )
  .refine((entry) => entry.repeat !== "recurring" || entry.frequency, {
    message: "Escolha a frequência.",
    path: ["frequency"],
  })
  .refine(
    (entry) =>
      entry.repeat !== "recurring" ||
      entry.endDate === "" ||
      entry.endDate >= entry.dueDate,
    {
      message: "O fim não pode ser antes do primeiro vencimento.",
      path: ["endDate"],
    },
  )
  .refine((entry) => !entry.isPaid || entry.paidAt !== "", {
    message: "Informe a data do pagamento.",
    path: ["paidAt"],
  })
  .refine(
    (entry) =>
      !entry.isPaid ||
      (entry.accountId !== undefined && entry.accountId !== "none"),
    { message: "Escolha a conta.", path: ["accountId"] },
  );

export type EntryInput = z.infer<typeof entrySchema>;

export const payEntrySchema = z.object({
  paidAt: dateSchema("Informe a data."),
  accountId: z.string().min(1, "Escolha a conta."),
  paidAmount: moneySchema,
});

export type PayEntryInput = z.infer<typeof payEntrySchema>;

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da conta.")
    .max(40, "Nome muito longo."),
  kind: z.enum(Constants.public.Enums.financial_account_kind),
  openingBalance: z.number().optional(),
});

export type AccountInput = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(40, "Nome muito longo."),
  kind: z.enum(Constants.public.Enums.financial_entry_kind),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Escolha a conta de origem."),
    toAccountId: z.string().min(1, "Escolha a conta de destino."),
    amount: moneySchema,
    transferredOn: dateSchema("Informe a data."),
    notes: z.string().trim().max(200, "Observação muito longa."),
  })
  .refine((transfer) => transfer.fromAccountId !== transfer.toAccountId, {
    message: "Escolha contas diferentes.",
    path: ["toAccountId"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
