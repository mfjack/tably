import { format } from "date-fns";
import { downloadFile } from "@/lib/download-file";
import { formatCnpj, formatPhone } from "@/lib/masks";
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
  formatReportCell,
  type ReportCell,
} from "./report-tables";

const PAGE_MARGIN_IN_MM = 14;
const TABLE_GAP_IN_MM = 8;
const MIN_SPACE_FOR_TABLE_IN_MM = 40;
const PAGE_TOP_IN_MM = 20;
const PRIMARY_COLOR: [number, number, number] = [31, 90, 67];
const MUTED_TEXT_COLOR: [number, number, number] = [94, 107, 102];

type DocumentWithLastTable = {
  lastAutoTable?: { finalY?: number };
};

function isNumericCell(cell: ReportCell) {
  return cell.kind !== "text";
}

export async function exportSalesReportPdf({
  report,
  business,
  generatedAt,
}: SalesReportExportInput): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const businessDetails = [
    business.taxId ? `CNPJ ${formatCnpj(business.taxId)}` : null,
    business.phone ? `Tel. ${formatPhone(business.phone)}` : null,
    business.address,
  ].filter((detail) => detail !== null);

  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text(business.name, PAGE_MARGIN_IN_MM, 20);

  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(...MUTED_TEXT_COLOR);
  if (businessDetails.length > 0) {
    document.text(businessDetails.join("  ·  "), PAGE_MARGIN_IN_MM, 26);
  }

  document.setTextColor(0, 0, 0);
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text(
    `${SALES_REPORT_TITLE} · ${formatReportPeriod(report)}`,
    PAGE_MARGIN_IN_MM,
    35,
  );
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(...MUTED_TEXT_COLOR);
  document.text(
    `Emitido em ${format(generatedAt, "dd/MM/yyyy, HH:mm")}`,
    pageWidth - PAGE_MARGIN_IN_MM,
    35,
    { align: "right" },
  );

  let cursorY = 42;

  for (const table of buildReportTables(report)) {
    if (cursorY > pageHeight - MIN_SPACE_FOR_TABLE_IN_MM) {
      document.addPage();
      cursorY = PAGE_TOP_IN_MM;
    }

    document.setTextColor(0, 0, 0);
    document.setFont("helvetica", "bold");
    document.setFontSize(11);
    document.text(table.title, PAGE_MARGIN_IN_MM, cursorY);

    const firstRow = table.rows[0] ?? table.footer ?? [];
    const numericColumns = new Set(
      firstRow.flatMap((cell, columnIndex) =>
        isNumericCell(cell) ? [columnIndex] : [],
      ),
    );
    autoTable(document, {
      startY: cursorY + 2,
      margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
      head: [table.headers],
      body: table.rows.map((row) => row.map(formatReportCell)),
      foot: table.footer ? [table.footer.map(formatReportCell)] : undefined,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
      footStyles: { fillColor: [244, 247, 245], textColor: 0 },
      didParseCell: (cellHook) => {
        if (numericColumns.has(cellHook.column.index)) {
          cellHook.cell.styles.halign = "right";
        }
      },
    });

    cursorY =
      ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? cursorY) +
      TABLE_GAP_IN_MM;
  }

  downloadFile(
    document.output("blob"),
    `relatorio-vendas-${formatReportPeriodForFile(report)}.pdf`,
  );
}
