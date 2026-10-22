import type { OrganizationId } from "@/features/organizations/types";
import { hasStockLosses } from "@/features/stock-losses/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/stock-losses/exists">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await hasStockLosses(organizationId as OrganizationId),
  );
}
