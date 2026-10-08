import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { SalesReport } from "@/features/sales-report/types";

type ExportFormat = "pdf" | "excel" | "thermal";

type SalesReportExportMenuProps = {
  report: SalesReport | undefined;
  business: OrderTicketBusiness;
};

async function runExport(
  exportFormat: ExportFormat,
  report: SalesReport,
  business: OrderTicketBusiness,
) {
  const input = { report, business, generatedAt: new Date() };

  if (exportFormat === "pdf") {
    const { exportSalesReportPdf } = await import(
      "@/features/sales-report/export/export-pdf"
    );
    await exportSalesReportPdf(input);
    return;
  }
  if (exportFormat === "excel") {
    const { exportSalesReportExcel } = await import(
      "@/features/sales-report/export/export-excel"
    );
    await exportSalesReportExcel(input);
    return;
  }
  const { printThermalSalesReport } = await import(
    "@/features/sales-report/export/print-thermal-report"
  );
  printThermalSalesReport(input);
}

export function SalesReportExportMenu({
  report,
  business,
}: SalesReportExportMenuProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );

  async function handleExport(exportFormat: ExportFormat) {
    if (!report) return;
    setExportingFormat(exportFormat);
    try {
      await runExport(exportFormat, report, business);
    } catch {
      toast.error("Não foi possível exportar o relatório.");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-11 px-4"
            disabled={!report}
            isLoading={exportingFormat !== null}
          />
        }
      >
        <Download aria-hidden />
        Exportar
        <ChevronDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText aria-hidden />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet aria-hidden />
          Baixar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("thermal")}>
          <Printer aria-hidden />
          Imprimir (80mm)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
