import type { NextRequest } from "next/server";
import { getPaymentReceivables } from "@/features/finance/receivables-actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/receivables">,
) {
  const { organizationId } = await params;
  const { searchParams } = request.nextUrl;
  return jsonActionResult(
    await getPaymentReceivables(
      organizationId as OrganizationId,
      searchParams.get("from") ?? "",
      searchParams.get("to") ?? "",
    ),
  );
}
