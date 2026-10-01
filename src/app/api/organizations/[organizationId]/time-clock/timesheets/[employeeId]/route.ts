import type { NextRequest } from "next/server";
import type { EmployeeId } from "@/features/employees/types";
import type { OrganizationId } from "@/features/organizations/types";
import { getTimesheet } from "@/features/time-clock/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/time-clock/timesheets/[employeeId]">,
) {
  const { organizationId, employeeId } = await params;
  const monthKey = request.nextUrl.searchParams.get("month") ?? "";

  return jsonActionResult(
    await getTimesheet(
      organizationId as OrganizationId,
      employeeId as EmployeeId,
      monthKey,
    ),
  );
}
