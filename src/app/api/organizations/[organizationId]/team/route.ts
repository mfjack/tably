import type { OrganizationId } from "@/features/organizations/types";
import { getTeam } from "@/features/team/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/team">,
) {
  const { organizationId } = await params;
  return jsonActionResult(await getTeam(organizationId as OrganizationId));
}
