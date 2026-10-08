import type { NextRequest } from "next/server";
import type { OrganizationId } from "@/features/organizations/types";
import { listStockLosses } from "@/features/stock-losses/actions";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/organizations/[organizationId]/stock-losses">,
) {
  const { organizationId } = await params;
  const month = request.nextUrl.searchParams.get("month");
  if (!month) return invalidRequestResponse();

  return jsonActionResult(
    await listStockLosses(organizationId as OrganizationId, month),
  );
}
