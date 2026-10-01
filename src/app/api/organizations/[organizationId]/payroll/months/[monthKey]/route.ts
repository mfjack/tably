import type { OrganizationId } from "@/features/organizations/types";
import { getPayrollMonth } from "@/features/payroll/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/payroll/months/[monthKey]">,
) {
  const { organizationId, monthKey } = await params;
  return jsonActionResult(
    await getPayrollMonth(organizationId as OrganizationId, monthKey),
  );
}
