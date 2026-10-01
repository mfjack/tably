import type { OrganizationId } from "@/features/organizations/types";
import { listTaskLists } from "@/features/tasks/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/task-lists">,
) {
  const { organizationId } = await params;
  return jsonActionResult(
    await listTaskLists(organizationId as OrganizationId),
  );
}
