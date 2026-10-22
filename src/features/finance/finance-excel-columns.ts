export const FINANCE_EXCEL_COLUMNS = [
  { key: "dueDate", header: "Vencimento", width: 13 },
  { key: "kind", header: "Tipo", width: 10 },
  { key: "description", header: "Descrição", width: 36 },
  { key: "category", header: "Categoria", width: 24 },
  { key: "supplier", header: "Fornecedor", width: 24 },
  { key: "installment", header: "Parcela", width: 10 },
  { key: "amount", header: "Valor", width: 14 },
  { key: "status", header: "Situação", width: 14 },
  { key: "paidAt", header: "Pago em", width: 13 },
  { key: "paidAmount", header: "Valor pago", width: 14 },
  { key: "notes", header: "Observações", width: 36 },
] as const;

export type FinanceExcelColumnKey =
  (typeof FINANCE_EXCEL_COLUMNS)[number]["key"];
