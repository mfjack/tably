import { listCustomerAccounts } from "@/features/customer-accounts/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/customer-accounts">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listCustomerAccounts(organizationId as OrganizationId),
  );
}
