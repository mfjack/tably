import type {
  DreGroup,
  EntryStatus,
  FinancialEntry,
  FinancialEntryKind,
  FinancialEntrySource,
  RecurrenceFrequency,
} from "./types";

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
    { name: "Insumos e mercadorias", dreGroup: "cost_of_goods" },
    { name: "Embalagens", dreGroup: "packaging" },
    { name: "Salários e encargos", dreGroup: "personnel" },
    { name: "Freelas e extras", dreGroup: "personnel" },
    { name: "Aluguel", dreGroup: "occupancy" },
    { name: "Água, luz e internet", dreGroup: "occupancy" },
    { name: "Impostos e taxas", dreGroup: "sales_deductions" },
    { name: "Manutenção", dreGroup: "administrative" },
    { name: "Marketing", dreGroup: "marketing" },
    { name: "Equipamentos e reformas", dreGroup: "investment" },
    { name: "Outras despesas", dreGroup: "administrative" },
  ],
  income: [
    { name: "Vendas", dreGroup: "revenue" },
    { name: "Recebimento de fiado", dreGroup: "other_income" },
    { name: "Outras receitas", dreGroup: "other_income" },
  ],
} as const satisfies Record<
  FinancialEntryKind,
  readonly { name: string; dreGroup: DreGroup }[]
>;

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

const EDITABLE_ENTRY_SOURCES: readonly FinancialEntrySource[] = [
  "manual",
  "stock_purchase",
];

export function isEditableEntrySource(source: FinancialEntrySource): boolean {
  return EDITABLE_ENTRY_SOURCES.includes(source);
}
