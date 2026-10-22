import type { NextRequest } from "next/server";
import { getIncomeStatement } from "@/features/finance/income-statement/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/income-statement">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getIncomeStatement(
      organizationId as OrganizationId,
      request.nextUrl.searchParams.get("month") ?? "",
    ),
  );
}
