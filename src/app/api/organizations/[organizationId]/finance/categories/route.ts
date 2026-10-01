import { listFinancialCategories } from "@/features/finance/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/categories">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listFinancialCategories(organizationId as OrganizationId),
  );
}
