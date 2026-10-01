import type { OrganizationId } from "@/features/organizations/types";
import { getPayrollSettings } from "@/features/payroll/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/payroll/settings">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getPayrollSettings(organizationId as OrganizationId),
  );
}
