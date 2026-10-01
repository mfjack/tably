import type { OrganizationId } from "@/features/organizations/types";
import { listTimeClockEmployees } from "@/features/time-clock/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/time-clock/employees">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listTimeClockEmployees(organizationId as OrganizationId),
  );
}
