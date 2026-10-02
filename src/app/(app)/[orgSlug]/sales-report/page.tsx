import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { prefetchModuleQueries } from "@/features/modules/prefetch-module-queries";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { toOrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { getSalesReport } from "@/features/sales-report/actions";
import { getSalesReportQueryKey } from "@/features/sales-report/hooks/use-sales-report-query";
import { toSalesReportPeriod } from "@/features/sales-report/periods";
import { SalesReportView } from "./components/sales-report-view";

const salesReportModule = getAppModule("sales_report");

export const metadata: Metadata = { title: salesReportModule.label };

export default async function SalesReportPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/sales-report">) {
  const [{ orgSlug }, { period: periodParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const organization = await requireVisibleModule(orgSlug, "sales_report");
  const period = toSalesReportPeriod(periodParam);
  const dehydratedState = await prefetchModuleQueries(
    organization.id,
    "sales_report",
    [
      {
        queryKey: getSalesReportQueryKey(organization.id, period),
        action: () => getSalesReport(organization.id, period),
      },
    ],
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <SalesReportView
        organizationId={organization.id}
        title={salesReportModule.label}
        ticketBusiness={toOrderTicketBusiness(organization)}
      />
    </HydrationBoundary>
  );
}
