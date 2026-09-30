import { EMPLOYMENT_TYPE_LABELS } from "@/features/employees/labels";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { formatMonthLabel } from "@/features/time-clock/time-utils";
import { downloadFile } from "@/lib/download-file";
import { formatCurrency, formatDateKey } from "@/lib/format";
import { formatCbo, formatCnpj, formatCpf, formatPis } from "@/lib/masks";
import { describePayslipPeriod, PAYSLIP_KIND_TITLES } from "./payslip-labels";
import type { Payslip } from "./types";

const PAGE_MARGIN_IN_MM = 14;
const PRIMARY_COLOR: [number, number, number] = [10, 10, 10];
const MUTED_TEXT_COLOR: [number, number, number] = [94, 107, 102];
const SIGNATURE_LINE_WIDTH_IN_MM = 90;

type DocumentWithLastTable = {
  lastAutoTable?: { finalY?: number };
};

function formatAmount(value: number): string {
  return formatCurrency(value).replace(/^\$ /, "");
}

export async function exportPayslipPdf(
  payslip: Payslip,
  business: OrderTicketBusiness,
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const { employee } = payslip;

  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text(business.name, PAGE_MARGIN_IN_MM, 18);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(...MUTED_TEXT_COLOR);
  const businessDetails = [
    business.taxId ? `CNPJ ${formatCnpj(business.taxId)}` : null,
    business.address,
  ].filter((detail) => detail !== null);
  if (businessDetails.length > 0) {
    document.text(businessDetails.join("  ·  "), PAGE_MARGIN_IN_MM, 23);
  }

  document.setTextColor(0, 0, 0);
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.text(
    payslip.kind === "monthly"
      ? "Recibo de pagamento de salário"
      : PAYSLIP_KIND_TITLES[payslip.kind],
    pageWidth - PAGE_MARGIN_IN_MM,
    18,
    { align: "right" },
  );
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text(
    `Referência: ${describePayslipPeriod(payslip)}`,
    pageWidth - PAGE_MARGIN_IN_MM,
    23,
    { align: "right" },
  );

  autoTable(document, {
    startY: 30,
    margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
    body: [
      [
        { content: "Funcionário", styles: { fontStyle: "bold" } },
        employee.name,
        { content: "CPF", styles: { fontStyle: "bold" } },
        formatCpf(employee.cpf),
      ],
      [
        { content: "Cargo", styles: { fontStyle: "bold" } },
        `${employee.jobTitle}${employee.cbo ? ` · CBO ${formatCbo(employee.cbo)}` : ""} (${EMPLOYMENT_TYPE_LABELS[employee.employmentType]})`,
        { content: "PIS", styles: { fontStyle: "bold" } },
        employee.pis ? formatPis(employee.pis) : "—",
      ],
      [
        { content: "Admissão", styles: { fontStyle: "bold" } },
        formatDateKey(employee.admissionDate),
        { content: "Dependentes IR", styles: { fontStyle: "bold" } },
        employee.dependents.toString(),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.8 },
  });

  let cursorY =
    ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? 30) + 4;

  autoTable(document, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
    head: [["Descrição", "Referência", "Vencimentos", "Descontos"]],
    body: payslip.items.map((item) => [
      item.description,
      item.reference,
      item.kind === "earning" ? formatAmount(item.amount) : "",
      item.kind === "deduction" ? formatAmount(item.amount) : "",
    ]),
    foot: [
      [
        "Totais",
        "",
        formatAmount(payslip.grossAmount),
        formatAmount(payslip.deductionAmount),
      ],
      [
        { content: "Valor líquido a receber", colSpan: 3 },
        formatCurrency(payslip.netAmount),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255 },
    footStyles: { fillColor: [244, 244, 244], textColor: 0 },
    columnStyles: {
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
  });

  cursorY =
    ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? cursorY) + 4;

  autoTable(document, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN_IN_MM, right: PAGE_MARGIN_IN_MM },
    head: [
      ["Salário base", "Base INSS", "Base FGTS", "FGTS do mês", "Base IRRF"],
    ],
    body: [
      [
        formatAmount(employee.salary),
        formatAmount(payslip.inssBase),
        formatAmount(payslip.fgtsBase),
        formatAmount(payslip.fgtsAmount),
        formatAmount(payslip.irrfBase),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.8, halign: "center" },
    headStyles: { fillColor: [80, 80, 80], textColor: 255 },
  });

  cursorY =
    ((document as DocumentWithLastTable).lastAutoTable?.finalY ?? cursorY) + 12;

  document.setFontSize(8.5);
  document.text(
    document.splitTextToSize(
      `Declaro ter recebido a importância líquida de ${formatCurrency(payslip.netAmount)} discriminada neste recibo, referente a ${formatMonthLabel(payslip.monthKey).toLowerCase()}.`,
      pageWidth - PAGE_MARGIN_IN_MM * 2,
    ),
    PAGE_MARGIN_IN_MM,
    cursorY,
  );

  const signatureY = cursorY + 22;
  document.text("Data: ____/____/______", PAGE_MARGIN_IN_MM, signatureY);
  document.line(
    pageWidth - PAGE_MARGIN_IN_MM - SIGNATURE_LINE_WIDTH_IN_MM,
    signatureY,
    pageWidth - PAGE_MARGIN_IN_MM,
    signatureY,
  );
  document.text(
    employee.name,
    pageWidth - PAGE_MARGIN_IN_MM - SIGNATURE_LINE_WIDTH_IN_MM,
    signatureY + 4,
  );

  const fileName = employee.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  downloadFile(
    document.output("blob"),
    `holerite-${fileName}-${payslip.monthKey}.pdf`,
  );
}
