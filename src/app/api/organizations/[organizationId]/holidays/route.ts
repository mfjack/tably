import type { NextRequest } from "next/server";
import { listHolidays } from "@/features/employees/actions";
import type { OrganizationId } from "@/features/organizations/types";
import { yearSchema } from "@/lib/api/route-params";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/organizations/[organizationId]/holidays">,
) {
  const { organizationId } = await params;
  const parsedYear = yearSchema.safeParse(
    request.nextUrl.searchParams.get("year"),
  );
  if (!parsedYear.success) return invalidRequestResponse();

  return jsonActionResult(
    await listHolidays(organizationId as OrganizationId, parsedYear.data),
  );
}
