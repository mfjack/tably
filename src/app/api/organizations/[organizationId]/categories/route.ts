import { listCategories } from "@/features/categories/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/categories">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listCategories(organizationId as OrganizationId),
  );
}
