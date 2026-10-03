import type { NextRequest } from "next/server";
import { findLoyaltyCustomer } from "@/features/loyalty/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/loyalty/lookup">,
) {
  const { organizationId } = await params;
  const phone = request.nextUrl.searchParams.get("phone") ?? "";
  return jsonActionResult(
    await findLoyaltyCustomer(organizationId as OrganizationId, phone),
  );
}
