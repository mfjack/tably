import type { NextRequest } from "next/server";
import { getFinancialOverview } from "@/features/finance/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/overview">,
) {
  const { organizationId } = await params;
  const monthKey = request.nextUrl.searchParams.get("month") ?? "";

  return jsonActionResult(
    await getFinancialOverview(organizationId as OrganizationId, monthKey),
  );
}
