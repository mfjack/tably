import { listOwnedOrganizations } from "@/features/auth/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET() {
  return jsonActionResult(await listOwnedOrganizations());
}
