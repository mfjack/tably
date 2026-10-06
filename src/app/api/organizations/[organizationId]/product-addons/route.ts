import type { OrganizationId } from "@/features/organizations/types";
import { listProductAddons } from "@/features/product-addons/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/product-addons">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listProductAddons(organizationId as OrganizationId),
  );
}
