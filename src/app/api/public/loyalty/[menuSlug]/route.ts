import type { NextRequest } from "next/server";
import { getPublicLoyaltyBalance } from "@/features/loyalty/public-actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/public/loyalty/[menuSlug]">,
) {
  const { menuSlug } = await params;
  const phone = request.nextUrl.searchParams.get("phone") ?? "";
  return jsonActionResult(await getPublicLoyaltyBalance(menuSlug, phone));
}
