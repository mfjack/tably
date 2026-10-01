import type { NextRequest } from "next/server";
import type { OrganizationId } from "@/features/organizations/types";
import { getSalesReport } from "@/features/sales-report/actions";
import { isSalesReportPeriod } from "@/features/sales-report/periods";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/organizations/[organizationId]/sales-report">,
) {
  const { organizationId } = await params;
  const period = request.nextUrl.searchParams.get("period") ?? "";
  if (!isSalesReportPeriod(period)) return invalidRequestResponse();

  return jsonActionResult(
    await getSalesReport(organizationId as OrganizationId, period),
  );
}
