import type { Workbook, Worksheet } from "exceljs";
import { downloadFile } from "@/lib/download-file";
import { CURRENCY_SYMBOL, formatDateKey } from "@/lib/format";
import { FINANCE_EXCEL_COLUMNS } from "./finance-excel-columns";
import { getEntryStatus, getEntryStatusLabel } from "./labels";
import type { FinancialEntry } from "./types";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const HEADER_FILL_COLOR = "FF0A0A0A";
const CURRENCY_FORMAT = `"${CURRENCY_SYMBOL}" #,##0.00`;

const CURRENCY_COLUMN_NUMBERS = [7, 10] as const;

const TEMPLATE_EXAMPLE_ROWS = [
  [
    "05/11/2026",
    "Despesa",
    "Aluguel",
    "Aluguel",
    "",
    "",
    3000,
    "",
    "05/11/2026",
    3000,
    "Exemplo: conta já paga",
  ],
  [
    "10/11/2026",
    "Despesa",
    "Leite",
    "Insumos e mercadorias",
    "Laticínios Boa Vista",
    "",
    420,
    "",
    "",
    "",
    "Exemplo: conta em aberto",
  ],
  [
    "10/11/2026",
    "Receita",
    "Evento fechado",
    "",
    "",
    "",
    1500,
    "",
    "",
    "",
    "Exemplo: receita a receber",
  ],
] as const;

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

async function createFinanceWorkbook(
  title: string,
): Promise<{ workbook: Workbook; sheet: Worksheet }> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Tably";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Financeiro", {
    views: [{ state: "frozen", ySplit: 3 }],
  });
  sheet.addRow([title]).font = { bold: true, size: 12 };
  sheet.addRow([]);

  const headerRow = sheet.addRow(
    FINANCE_EXCEL_COLUMNS.map((column) => column.header),
  );
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL_COLOR },
    };
  });

  FINANCE_EXCEL_COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });
  for (const columnNumber of CURRENCY_COLUMN_NUMBERS) {
    sheet.getColumn(columnNumber).numFmt = CURRENCY_FORMAT;
  }

  return { workbook, sheet };
}

async function downloadWorkbook(workbook: Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(new Blob([buffer], { type: EXCEL_MIME_TYPE }), fileName);
}

export async function exportFinanceExcel({
  businessName,
  monthLabel,
  monthKey,
  today,
  entries,
}: FinanceExportInput): Promise<void> {
  const { workbook, sheet } = await createFinanceWorkbook(
    `${businessName} · Financeiro · ${monthLabel}`,
  );

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

  await downloadWorkbook(workbook, `financeiro-${monthKey}.xlsx`);
}

export async function downloadFinanceImportTemplate(): Promise<void> {
  const { workbook, sheet } = await createFinanceWorkbook(
    "Modelo para importar no Financeiro · apague os exemplos e preencha a partir da linha 4",
  );
  for (const row of TEMPLATE_EXAMPLE_ROWS) sheet.addRow([...row]);
  await downloadWorkbook(workbook, "modelo-financeiro.xlsx");
}
