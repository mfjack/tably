import { downloadWorkbook } from "@/lib/download-workbook";
import { CURRENCY_SYMBOL } from "@/lib/format";
import { getStatementSign, getVariation } from "./statement-format";
import type { IncomeStatement, StatementLine } from "./types";

const CURRENCY_FORMAT = `"${CURRENCY_SYMBOL}" #,##0.00`;
const PERCENT_FORMAT = "0.0%";
const HEADER_FILL_COLOR = "FF0A0A0A";
const SUBTOTAL_FILL_COLOR = "FFF2F2F2";
const DETAIL_INDENT = "      ";

const COLUMN_WIDTHS = [44, 16, 10, 16, 12] as const;

type IncomeStatementExportInput = {
  businessName: string;
  monthLabel: string;
  previousMonthLabel: string;
  monthKey: string;
  statement: IncomeStatement;
};

function toSignedAmount(line: StatementLine, amount: number): number {
  return getStatementSign(line.kind) === "minus" ? -amount : amount;
}

export async function exportIncomeStatementExcel({
  businessName,
  monthLabel,
  previousMonthLabel,
  monthKey,
  statement,
}: IncomeStatementExportInput): Promise<void> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Tably";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("DRE");

  sheet.addRow([`${businessName} · DRE gerencial · ${monthLabel}`]).font = {
    bold: true,
    size: 12,
  };
  sheet.addRow([]);
  const headerRow = sheet.addRow([
    "",
    monthLabel,
    "% receita",
    previousMonthLabel,
    "Variação",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL_COLOR },
    };
  });

  const lines = [...statement.lines, statement.investments];
  for (const line of lines) {
    const row = sheet.addRow([
      line.label,
      toSignedAmount(line, line.amount),
      statement.grossRevenue > 0 ? line.amount / statement.grossRevenue : "",
      toSignedAmount(line, line.previousAmount),
      getVariation(line.amount, line.previousAmount) ?? "",
    ]);
    if (line.kind === "subtotal" || line.kind === "result") {
      row.font = { bold: true };
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: SUBTOTAL_FILL_COLOR },
        };
      });
    }
    for (const detail of line.details) {
      const detailRow = sheet.addRow([
        `${DETAIL_INDENT}${detail.label}`,
        toSignedAmount(line, detail.amount),
        statement.grossRevenue > 0
          ? detail.amount / statement.grossRevenue
          : "",
      ]);
      detailRow.font = { color: { argb: "FF666666" } };
    }
  }

  sheet.addRow([]);
  sheet.addRow(["Indicadores"]).font = { bold: true };
  for (const indicator of statement.indicators) {
    sheet.addRow([
      `${indicator.label} · ${indicator.target}`,
      indicator.amount,
      indicator.percent ?? "",
    ]);
  }

  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  for (const columnNumber of [2, 4]) {
    sheet.getColumn(columnNumber).numFmt = CURRENCY_FORMAT;
  }
  for (const columnNumber of [3, 5]) {
    sheet.getColumn(columnNumber).numFmt = PERCENT_FORMAT;
  }

  await downloadWorkbook(workbook, `dre-${monthKey}.xlsx`);
}
