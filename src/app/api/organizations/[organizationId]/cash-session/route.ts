import { getOpenCashSession } from "@/features/cash-register/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/cash-session">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getOpenCashSession(organizationId as OrganizationId),
  );
}
