import { listActiveKitchenTickets } from "@/features/kitchen/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/kitchen-tickets">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listActiveKitchenTickets(organizationId as OrganizationId),
  );
}
