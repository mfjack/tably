import type { PaymentMethod } from "@/features/orders/types";
import type { ProductId } from "@/features/products/types";
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

export type CanceledSummary = {
  orderCount: number;
  total: number;
};

export type SalesByPaymentMethod = {
  method: PaymentMethod;
  revenue: number;
  orderCount: number;
};

export type SalesByPaymentMethodWithFee = SalesByPaymentMethod & {
  fee: number;
  surcharge: number;
};

export type SalesByOperatorPayment = SalesByPaymentMethod & {
  operatorName: string | null;
};

export type SalesAccountReceipt = SalesByOperatorPayment & {
  fee: number;
  surcharge: number;
};

export type SalesByDay = {
  date: string;
  revenue: number;
  orderCount: number;
};

export type SalesByHour = {
  hour: number;
  revenue: number;
  orderCount: number;
};

export type SalesByWeekday = {
  weekday: number;
  revenue: number;
  orderCount: number;
};

export type ProductSales = {
  productId: ProductId | null;
  productName: string;
  categoryName: string | null;
  quantity: number;
  revenue: number;
  cost: number;
  orderCount: number;
};

export type LoyaltySummary = {
  stampsGiven: number;
  rewardsRedeemed: number;
  rewardCost: number;
  activeCustomers: number;
  newCustomers: number;
};

export type SalesReport = {
  startDate: string;
  endDate: string;
  summary: SalesSummary;
  previousSummary: Pick<SalesSummary, "revenue" | "orderCount">;
  canceled: CanceledSummary;
  loyalty: LoyaltySummary;
  byPaymentMethod: SalesByPaymentMethodWithFee[];
  byOperatorPayment: SalesByOperatorPayment[];
  accountReceipts: SalesAccountReceipt[];
  byDay: SalesByDay[];
  byHour: SalesByHour[];
  byWeekday: SalesByWeekday[];
  products: ProductSales[];
};
