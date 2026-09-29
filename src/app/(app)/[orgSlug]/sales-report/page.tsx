import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { toOrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { SalesReportView } from "./components/sales-report-view";

const salesReportModule = getAppModule("sales_report");

export const metadata: Metadata = { title: salesReportModule.label };

export default async function SalesReportPage({
  params,
}: PageProps<"/[orgSlug]/sales-report">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "sales_report");

  return (
    <SalesReportView
      organizationId={organization.id}
      title={salesReportModule.label}
      ticketBusiness={toOrderTicketBusiness(organization)}
    />
  );
}
