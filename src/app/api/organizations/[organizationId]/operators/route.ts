import { listOperators } from "@/features/operators/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/operators">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listOperators(organizationId as OrganizationId),
  );
}
