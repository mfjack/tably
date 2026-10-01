import type { OrganizationId } from "@/features/organizations/types";
import { listSuppliers } from "@/features/suppliers/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/suppliers">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listSuppliers(organizationId as OrganizationId),
  );
}
