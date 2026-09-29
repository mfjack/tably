import { downloadFile } from "@/lib/download-file";
import { CURRENCY_SYMBOL } from "@/lib/format";
import {
  formatReportPeriod,
  formatReportPeriodForFile,
} from "../report-metrics";
import {
  SALES_REPORT_TITLE,
  type SalesReportExportInput,
} from "./export-types";
import {
  buildReportTables,
  type ReportCell,
  type ReportCellKind,
} from "./report-tables";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const HEADER_FILL_COLOR = "FF1F5A43";
const MIN_COLUMN_WIDTH = 12;
const MAX_COLUMN_WIDTH = 40;

const NUMBER_FORMATS: Readonly<Record<ReportCellKind, string | undefined>> = {
  text: undefined,
  number: "0",
  currency: `"${CURRENCY_SYMBOL}" #,##0.00`,
  percent: "0.0%",
};

const MAX_SHEET_NAME_LENGTH = 31;

function getColumnWidth(
  headers: string[],
  rows: ReportCell[][],
  index: number,
) {
  const longestValue = Math.max(
    headers[index]?.length ?? 0,
    ...rows.map((row) => String(row[index]?.value ?? "").length),
  );
  return Math.min(
    Math.max(longestValue + 4, MIN_COLUMN_WIDTH),
    MAX_COLUMN_WIDTH,
  );
}

export async function exportSalesReportExcel({
  report,
  business,
  generatedAt,
}: SalesReportExportInput): Promise<void> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Tably";
  workbook.created = generatedAt;

  for (const table of buildReportTables(report)) {
    const sheet = workbook.addWorksheet(
      table.title.slice(0, MAX_SHEET_NAME_LENGTH),
      { views: [{ state: "frozen", ySplit: 3 }] },
    );

    sheet.addRow([
      `${business.name} · ${SALES_REPORT_TITLE} · ${formatReportPeriod(report)}`,
    ]).font = { bold: true, size: 12 };
    sheet.addRow([]);

    const headerRow = sheet.addRow(table.headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL_COLOR },
      };
    });

    const allRows = table.footer ? [...table.rows, table.footer] : table.rows;
    allRows.forEach((cells, rowIndex) => {
      const row = sheet.addRow(cells.map((cell) => cell.value));
      if (table.footer && rowIndex === allRows.length - 1) {
        row.font = { bold: true };
      }
      cells.forEach((cell, columnIndex) => {
        const numberFormat = NUMBER_FORMATS[cell.kind];
        if (numberFormat) row.getCell(columnIndex + 1).numFmt = numberFormat;
      });
    });

    table.headers.forEach((_, columnIndex) => {
      sheet.getColumn(columnIndex + 1).width = getColumnWidth(
        table.headers,
        allRows,
        columnIndex,
      );
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    new Blob([buffer], { type: EXCEL_MIME_TYPE }),
    `relatorio-vendas-${formatReportPeriodForFile(report)}.xlsx`,
  );
}
