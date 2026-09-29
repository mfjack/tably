import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { SalesReport } from "../types";

export type SalesReportExportInput = {
  report: SalesReport;
  business: OrderTicketBusiness;
  generatedAt: Date;
};

export const SALES_REPORT_TITLE = "Relatório de vendas";
