import { listLoyaltyCustomers } from "@/features/loyalty/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/loyalty/customers">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listLoyaltyCustomers(organizationId as OrganizationId),
  );
}
