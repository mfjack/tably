import { listSupplierPurchases } from "@/features/suppliers/actions";
import type { SupplierId } from "@/features/suppliers/types";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/organizations/[organizationId]/suppliers/[supplierId]/purchases">,
) {
  const { supplierId } = await params;
  return jsonActionResult(
    await listSupplierPurchases(supplierId as SupplierId),
  );
}
