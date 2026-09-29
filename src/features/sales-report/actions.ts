"use server";

import { z } from "zod";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SalesReport, SalesReportPeriod } from "./types";

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
  by_payment_method: z.array(
    summarySchema.extend({
      method: z.enum(Constants.public.Enums.payment_method),
    }),
  ),
  by_day: z.array(summarySchema.extend({ date: z.string() })),
  top_products: z.array(
    z.object({
      product_name: z.string(),
      quantity: z.number(),
      revenue: z.number(),
      cost: z.number(),
    }),
  ),
});

export async function getSalesReport(
  organizationId: OrganizationId,
  period: SalesReportPeriod,
): Promise<ActionResult<SalesReport>> {
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
    byPaymentMethod: report.by_payment_method.map((payment) => ({
      method: payment.method,
      revenue: payment.revenue,
      orderCount: payment.order_count,
    })),
    byDay: report.by_day.map((day) => ({
      date: day.date,
      revenue: day.revenue,
      orderCount: day.order_count,
    })),
    topProducts: report.top_products.map((product) => ({
      productName: product.product_name,
      quantity: product.quantity,
      revenue: product.revenue,
      cost: product.cost,
    })),
  });
}
