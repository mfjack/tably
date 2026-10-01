import { listAccountEntries } from "@/features/customer-accounts/actions";
import type { CustomerAccountId } from "@/features/customer-accounts/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/customer-accounts/[accountId]/entries">,
) {
  const { accountId } = await params;
  return jsonActionResult(
    await listAccountEntries(accountId as CustomerAccountId),
  );
}
