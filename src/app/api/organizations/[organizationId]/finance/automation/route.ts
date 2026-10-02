import { getFinanceAutomationSettings } from "@/features/finance/automation-actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/automation">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await getFinanceAutomationSettings(organizationId as OrganizationId),
  );
}
