import type { OrganizationId } from "@/features/organizations/types";
import { listTemperatureRecords } from "@/features/tasks/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/temperature-records">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listTemperatureRecords(organizationId as OrganizationId),
  );
}
