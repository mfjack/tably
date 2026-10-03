import { getOpeningBalance } from "@/features/finance/opening-balance-actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/opening-balance">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getOpeningBalance(organizationId as OrganizationId),
  );
}
