import { listPendingOnlineOrders } from "@/features/online-orders/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/online-orders">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listPendingOnlineOrders(organizationId as OrganizationId),
  );
}
