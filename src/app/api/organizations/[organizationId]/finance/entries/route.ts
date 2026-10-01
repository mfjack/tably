import type { NextRequest } from "next/server";
import { z } from "zod";
import { listFinancialEntries } from "@/features/finance/actions";
import { ENTRY_LIST_FILTERS } from "@/features/finance/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import {
  invalidRequestResponse,
  jsonActionResult,
} from "@/lib/api/route-responses";
import { Constants } from "@/lib/supabase/database.types";

const entriesQuerySchema = z.object({
  kind: z.enum(Constants.public.Enums.financial_entry_kind),
  month: z.string(),
  filter: z.enum(ENTRY_LIST_FILTERS),
});

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/finance/entries">,
) {
  const { organizationId } = await params;
  const parsedQuery = entriesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsedQuery.success) return invalidRequestResponse();

  const { kind, month, filter } = parsedQuery.data;
  return jsonActionResult(
    await listFinancialEntries(
      organizationId as OrganizationId,
      kind,
      month,
      filter,
    ),
  );
}
