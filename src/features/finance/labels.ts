import type {
  EntryStatus,
  FinancialAccountKind,
  FinancialEntry,
  FinancialEntryKind,
  RecurrenceFrequency,
} from "./types";

export const ACCOUNT_KIND_LABELS = {
  cash: "Caixa (dinheiro)",
  bank: "Conta bancária",
  card_acquirer: "Maquininha de cartão",
  digital_wallet: "Carteira digital",
} as const satisfies Record<FinancialAccountKind, string>;

export const ENTRY_KIND_LABELS = {
  income: "Receita",
  expense: "Despesa",
} as const satisfies Record<FinancialEntryKind, string>;

export const RECURRENCE_FREQUENCY_LABELS = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
} as const satisfies Record<RecurrenceFrequency, string>;

export const DEFAULT_CATEGORIES = {
  expense: [
    "Insumos e mercadorias",
    "Embalagens",
    "Salários e encargos",
    "Aluguel",
    "Água, luz e internet",
    "Impostos e taxas",
    "Taxas de cartão",
    "Manutenção",
    "Marketing",
    "Outras despesas",
  ],
  income: ["Vendas", "Recebimento de fiado", "Outras receitas"],
} as const satisfies Record<FinancialEntryKind, readonly string[]>;

export function getEntryStatus(
  entry: Pick<FinancialEntry, "paidAt" | "dueDate">,
  today: string,
): EntryStatus {
  if (entry.paidAt) return "paid";
  if (entry.dueDate < today) return "overdue";
  if (entry.dueDate === today) return "due_today";
  return "open";
}

export function getEntryStatusLabel(
  status: EntryStatus,
  kind: FinancialEntryKind,
): string {
  switch (status) {
    case "paid":
      return kind === "expense" ? "Paga" : "Recebida";
    case "overdue":
      return "Atrasada";
    case "due_today":
      return "Vence hoje";
    case "open":
      return "Em aberto";
  }
}
