import { listDocuments } from "@/features/documents/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/documents">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listDocuments(organizationId as OrganizationId),
  );
}
