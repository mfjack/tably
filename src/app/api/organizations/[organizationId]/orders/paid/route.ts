import { listPaidOrders } from "@/features/orders/tab-actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/orders/paid">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listPaidOrders(organizationId as OrganizationId),
  );
}
