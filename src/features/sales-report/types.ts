import type { PaymentMethod } from "@/features/orders/types";
import type { Database } from "@/lib/supabase/database.types";

export type SalesReportPeriod =
  Database["public"]["Enums"]["sales_report_period"];

export type SalesSummary = {
  revenue: number;
  orderCount: number;
  takeawayFees: number;
  cost: number;
  itemCount: number;
};

export type SalesByPaymentMethod = {
  method: PaymentMethod;
  revenue: number;
  orderCount: number;
};

export type SalesByDay = {
  date: string;
  revenue: number;
  orderCount: number;
};

export type TopProduct = {
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
};

export type SalesReport = {
  startDate: string;
  endDate: string;
  summary: SalesSummary;
  previousSummary: Pick<SalesSummary, "revenue" | "orderCount">;
  byPaymentMethod: SalesByPaymentMethod[];
  byDay: SalesByDay[];
  topProducts: TopProduct[];
};
