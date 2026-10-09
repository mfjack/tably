import type {
  EntryStatus,
  FinancialAccountKind,
  FinancialEntry,
  FinancialEntryKind,
  FinancialEntrySource,
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

export const ENTRY_SOURCE_LABELS = {
  manual: "Manual",
  sales: "Vendas",
  sales_fee: "Taxa de vendas",
  customer_payments: "Fiado recebido",
  customer_payments_fee: "Taxa do fiado",
  stock_purchase: "Compra de insumo",
  payroll_salary: "Folha",
  payroll_fgts: "Folha",
  payroll_taxes: "Folha",
} as const satisfies Record<FinancialEntrySource, string>;

const EDITABLE_ENTRY_SOURCES: readonly FinancialEntrySource[] = [
  "manual",
  "stock_purchase",
];

export function isEditableEntrySource(source: FinancialEntrySource): boolean {
  return EDITABLE_ENTRY_SOURCES.includes(source);
}
