import type { CellValue, Row, Worksheet } from "exceljs";
import {
  FINANCE_EXCEL_COLUMNS,
  type FinanceExcelColumnKey,
} from "../finance-excel-columns";
import {
  type FinanceImportRow,
  financeImportRowSchema,
  MAX_IMPORT_ROWS,
} from "./schemas";

const HEADER_SEARCH_ROW_LIMIT = 20;
const BRAZILIAN_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const INCOME_KIND_LABEL = "receita";

export type ParsedFinanceRow =
  | { rowNumber: number; status: "valid"; input: FinanceImportRow }
  | {
      rowNumber: number;
      status: "invalid";
      description: string;
      error: string;
    };

export type ParsedFinanceSheet = {
  rows: ParsedFinanceRow[];
  error: string | null;
};

type ColumnPositions = Partial<Record<FinanceExcelColumnKey, number>>;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getCellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if ("result" in value) return getCellText(value.result as CellValue);
    if ("text" in value) return String(value.text).trim();
    return "";
  }
  return String(value).trim();
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseDate(value: CellValue): string {
  if (value instanceof Date) {
    return toDateKey(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }
  const text = getCellText(value);
  const brazilianMatch = BRAZILIAN_DATE_PATTERN.exec(text);
  if (brazilianMatch) {
    const year = Number(brazilianMatch[3]);
    return toDateKey(
      year < 100 ? 2000 + year : year,
      Number(brazilianMatch[2]),
      Number(brazilianMatch[1]),
    );
  }
  const isoMatch = ISO_DATE_PATTERN.exec(text);
  return isoMatch ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` : text;
}

function parseMoney(value: CellValue): number | null {
  if (typeof value === "number") return value;
  const text = getCellText(value).replace(/[^\d,.-]/g, "");
  if (text === "") return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function findHeader(
  sheet: Worksheet,
): { rowNumber: number; positions: ColumnPositions } | null {
  for (
    let rowNumber = 1;
    rowNumber <= Math.min(sheet.rowCount, HEADER_SEARCH_ROW_LIMIT);
    rowNumber += 1
  ) {
    const positions: ColumnPositions = {};
    sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
      const header = normalizeText(getCellText(cell.value));
      const column = FINANCE_EXCEL_COLUMNS.find(
        ({ header: columnHeader }) => normalizeText(columnHeader) === header,
      );
      if (column) positions[column.key] = columnNumber;
    });
    if (positions.dueDate && positions.description && positions.amount) {
      return { rowNumber, positions };
    }
  }
  return null;
}

function readRow(row: Row, positions: ColumnPositions) {
  function cellValue(key: FinanceExcelColumnKey): CellValue {
    const columnNumber = positions[key];
    return columnNumber ? row.getCell(columnNumber).value : null;
  }
  function cellText(key: FinanceExcelColumnKey): string {
    return getCellText(cellValue(key));
  }

  const paidAt = cellText("paidAt") ? parseDate(cellValue("paidAt")) : "";
  return {
    kind:
      normalizeText(cellText("kind")) === INCOME_KIND_LABEL
        ? ("income" as const)
        : ("expense" as const),
    description: cellText("description"),
    amount: parseMoney(cellValue("amount")) ?? Number.NaN,
    dueDate: parseDate(cellValue("dueDate")),
    categoryName: cellText("category"),
    supplierName: cellText("supplier"),
    paidAt,
    paidAmount: paidAt ? parseMoney(cellValue("paidAmount")) : null,
    notes: cellText("notes"),
  };
}

export async function parseFinanceExcel(
  file: File,
): Promise<ParsedFinanceSheet> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      rows: [],
      error: "Não foi possível ler o arquivo. Envie uma planilha .xlsx.",
    };
  }

  const sheet = workbook.worksheets[0];
  const header = sheet ? findHeader(sheet) : null;
  if (!sheet || !header) {
    return {
      rows: [],
      error:
        "Não encontramos as colunas Vencimento, Descrição e Valor. Use o modelo ou um Excel baixado do Financeiro.",
    };
  }

  const rows: ParsedFinanceRow[] = [];
  for (
    let rowNumber = header.rowNumber + 1;
    rowNumber <= sheet.rowCount && rows.length < MAX_IMPORT_ROWS;
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);
    const dueDateColumn = header.positions.dueDate;
    if (
      !dueDateColumn ||
      getCellText(row.getCell(dueDateColumn).value) === ""
    ) {
      continue;
    }
    const input = readRow(row, header.positions);

    const parsed = financeImportRowSchema.safeParse(input);
    rows.push(
      parsed.success
        ? { rowNumber, status: "valid", input: parsed.data }
        : {
            rowNumber,
            status: "invalid",
            description: input.description || "Sem descrição",
            error: parsed.error.issues[0]?.message ?? "Linha inválida.",
          },
    );
  }

  return {
    rows,
    error: rows.length === 0 ? "A planilha não tem lançamentos." : null,
  };
}
