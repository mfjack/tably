import { downloadFile } from "@/lib/download-file";
import { CURRENCY_SYMBOL, formatDateKey } from "@/lib/format";
import { getEntryStatus, getEntryStatusLabel } from "./labels";
import type { FinancialEntry } from "./types";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const HEADER_FILL_COLOR = "FF0A0A0A";
const CURRENCY_FORMAT = `"${CURRENCY_SYMBOL}" #,##0.00`;

const COLUMNS = [
  { header: "Vencimento", width: 13 },
  { header: "Tipo", width: 10 },
  { header: "Descrição", width: 36 },
  { header: "Categoria", width: 24 },
  { header: "Fornecedor", width: 24 },
  { header: "Parcela", width: 10 },
  { header: "Valor", width: 14 },
  { header: "Situação", width: 14 },
  { header: "Pago em", width: 13 },
  { header: "Valor pago", width: 14 },
  { header: "Observações", width: 36 },
] as const;

const CURRENCY_COLUMN_NUMBERS = [7, 10] as const;

export type FinanceExportInput = {
  businessName: string;
  monthLabel: string;
  monthKey: string;
  today: string;
  entries: readonly FinancialEntry[];
};

function toRow(entry: FinancialEntry, today: string) {
  const isIncome = entry.kind === "income";
  return [
    formatDateKey(entry.dueDate),
    isIncome ? "Receita" : "Despesa",
    entry.description,
    entry.categoryName ?? "",
    entry.supplierName ?? "",
    entry.installmentNumber && entry.installmentCount
      ? `${entry.installmentNumber}/${entry.installmentCount}`
      : "",
    entry.amount,
    getEntryStatusLabel(getEntryStatus(entry, today), entry.kind),
    entry.paidAt ? formatDateKey(entry.paidAt) : "",
    entry.paidAmount ?? "",
    entry.notes ?? "",
  ];
}

function sumAmounts(
  entries: readonly FinancialEntry[],
  kind: FinancialEntry["kind"],
) {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((total, entry) => total + entry.amount, 0);
}

export async function exportFinanceExcel({
  businessName,
  monthLabel,
  monthKey,
  today,
  entries,
}: FinanceExportInput): Promise<void> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Tably";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Financeiro", {
    views: [{ state: "frozen", ySplit: 3 }],
  });
  sheet.addRow([`${businessName} · Financeiro · ${monthLabel}`]).font = {
    bold: true,
    size: 12,
  };
  sheet.addRow([]);

  const headerRow = sheet.addRow(COLUMNS.map((column) => column.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL_COLOR },
    };
  });

  for (const entry of entries) sheet.addRow(toRow(entry, today));

  sheet.addRow([]);
  const incomeTotal = sumAmounts(entries, "income");
  const expenseTotal = sumAmounts(entries, "expense");
  for (const [label, value] of [
    ["Total de receitas", incomeTotal],
    ["Total de despesas", expenseTotal],
    ["Resultado", incomeTotal - expenseTotal],
  ] as const) {
    const totalRow = sheet.addRow(["", "", label, "", "", "", value]);
    totalRow.font = { bold: true };
  }

  COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });
  for (const columnNumber of CURRENCY_COLUMN_NUMBERS) {
    sheet.getColumn(columnNumber).numFmt = CURRENCY_FORMAT;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    new Blob([buffer], { type: EXCEL_MIME_TYPE }),
    `financeiro-${monthKey}.xlsx`,
  );
}
