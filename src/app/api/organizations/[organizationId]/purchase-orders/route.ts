import type { OrganizationId } from "@/features/organizations/types";
import { listPendingPurchaseOrders } from "@/features/purchase-orders/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/purchase-orders">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listPendingPurchaseOrders(organizationId as OrganizationId),
  );
}
