import type { OrganizationId } from "@/features/organizations/types";
import { getVacationsOverview } from "@/features/payroll/extra-actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/payroll/vacations">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getVacationsOverview(organizationId as OrganizationId),
  );
}
