import type { OrganizationId } from "@/features/organizations/types";
import { getThirteenthYear } from "@/features/payroll/extra-actions";
import { yearSchema } from "@/lib/api/route-params";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/payroll/thirteenth/[year]">,
) {
  const { organizationId, year } = await params;
  const parsedYear = yearSchema.safeParse(year);
  if (!parsedYear.success) return invalidRequestResponse();

  return jsonActionResult(
    await getThirteenthYear(organizationId as OrganizationId, parsedYear.data),
  );
}
