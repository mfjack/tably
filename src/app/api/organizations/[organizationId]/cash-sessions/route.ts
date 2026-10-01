import { listCashSessions } from "@/features/cash-register/actions";
import type { OrganizationId } from "@/features/organizations/types";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/organizations/[organizationId]/cash-sessions">,
) {
  const { organizationId } = await params;
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  if (!startDate || !endDate) return invalidRequestResponse();

  return jsonActionResult(
    await listCashSessions(
      organizationId as OrganizationId,
      startDate,
      endDate,
    ),
  );
}
