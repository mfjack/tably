import { listWorkSchedules } from "@/features/employees/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/work-schedules">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listWorkSchedules(organizationId as OrganizationId),
  );
}
