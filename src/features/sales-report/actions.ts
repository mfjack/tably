"use server";

import * as z from "zod";
import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SalesReport, SalesReportPeriod } from "./types";

const paymentMethodSchema = z.enum(Constants.public.Enums.payment_method);

const summarySchema = z.object({
  revenue: z.number(),
  order_count: z.number(),
});

const salesReportRowSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  summary: summarySchema.extend({
    takeaway_fees: z.number(),
    cost: z.number(),
    item_count: z.number(),
  }),
  previous_summary: summarySchema,
  canceled: z.object({ order_count: z.number(), total: z.number() }),
  by_payment_method: z.array(
    summarySchema.extend({ method: paymentMethodSchema }),
  ),
  by_operator_payment: z.array(
    summarySchema.extend({
      method: paymentMethodSchema,
      operator_name: z.string().nullable(),
    }),
  ),
  account_receipts: z.array(
    summarySchema.extend({
      method: paymentMethodSchema,
      operator_name: z.string().nullable(),
    }),
  ),
  by_day: z.array(summarySchema.extend({ date: z.string() })),
  by_hour: z.array(summarySchema.extend({ hour: z.number() })),
  by_weekday: z.array(summarySchema.extend({ weekday: z.number() })),
  products: z.array(
    z.object({
      product_id: z.string().nullable(),
      product_name: z.string(),
      category_name: z.string().nullable(),
      quantity: z.number(),
      revenue: z.number(),
      cost: z.number(),
      order_count: z.number(),
    }),
  ),
});

export async function getSalesReport(
  organizationId: OrganizationId,
  period: SalesReportPeriod,
): Promise<ActionResult<SalesReport>> {
  if (!(await hasModuleAccess(organizationId, "sales_report"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sales_report", {
    p_organization_id: organizationId,
    p_period: period,
  });

  const parsedReport = salesReportRowSchema.safeParse(data);
  if (error || !parsedReport.success) {
    return actionFailure("Não foi possível carregar o relatório.");
  }

  const report = parsedReport.data;
  return actionSuccess({
    startDate: report.start_date,
    endDate: report.end_date,
    summary: {
      revenue: report.summary.revenue,
      orderCount: report.summary.order_count,
      takeawayFees: report.summary.takeaway_fees,
      cost: report.summary.cost,
      itemCount: report.summary.item_count,
    },
    previousSummary: {
      revenue: report.previous_summary.revenue,
      orderCount: report.previous_summary.order_count,
    },
    canceled: {
      orderCount: report.canceled.order_count,
      total: report.canceled.total,
    },
    byPaymentMethod: report.by_payment_method.map((payment) => ({
      method: payment.method,
      revenue: payment.revenue,
      orderCount: payment.order_count,
    })),
    byOperatorPayment: report.by_operator_payment.map((payment) => ({
      operatorName: payment.operator_name,
      method: payment.method,
      revenue: payment.revenue,
      orderCount: payment.order_count,
    })),
    accountReceipts: report.account_receipts.map((receipt) => ({
      operatorName: receipt.operator_name,
      method: receipt.method,
      revenue: receipt.revenue,
      orderCount: receipt.order_count,
    })),
    byDay: report.by_day.map((day) => ({
      date: day.date,
      revenue: day.revenue,
      orderCount: day.order_count,
    })),
    byHour: report.by_hour.map((hour) => ({
      hour: hour.hour,
      revenue: hour.revenue,
      orderCount: hour.order_count,
    })),
    byWeekday: report.by_weekday.map((weekday) => ({
      weekday: weekday.weekday,
      revenue: weekday.revenue,
      orderCount: weekday.order_count,
    })),
    products: report.products.map((product) => ({
      productId: product.product_id as ProductId | null,
      productName: product.product_name,
      categoryName: product.category_name,
      quantity: product.quantity,
      revenue: product.revenue,
      cost: product.cost,
      orderCount: product.order_count,
    })),
  });
}
