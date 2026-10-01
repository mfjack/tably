import type { OrganizationId } from "@/features/organizations/types";
import { listProducts } from "@/features/products/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/products">,
) {
  const { organizationId } = await params;
  return jsonActionResult(await listProducts(organizationId as OrganizationId));
}
