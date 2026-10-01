import type { NextRequest } from "next/server";
import { z } from "zod";
import { getFinancialAnalysis } from "@/features/finance/actions";
import { PROJECTION_HORIZONS } from "@/features/finance/analysis";
import type { OrganizationId } from "@/features/organizations/types";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

const horizonSchema = z.coerce.number().pipe(z.literal(PROJECTION_HORIZONS));

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/analysis">,
) {
  const { organizationId } = await params;
  const { searchParams } = request.nextUrl;
  const parsedHorizon = horizonSchema.safeParse(searchParams.get("horizon"));
  if (!parsedHorizon.success) return invalidRequestResponse();

  return jsonActionResult(
    await getFinancialAnalysis(
      organizationId as OrganizationId,
      searchParams.get("month") ?? "",
      parsedHorizon.data,
    ),
  );
}
