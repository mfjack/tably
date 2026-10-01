import type { OrganizationId } from "@/features/organizations/types";
import { listSupplierSummaries } from "@/features/suppliers/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/suppliers/summaries">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listSupplierSummaries(organizationId as OrganizationId),
  );
}
