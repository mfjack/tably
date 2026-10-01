import { listIngredients } from "@/features/ingredients/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/ingredients">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listIngredients(organizationId as OrganizationId),
  );
}
