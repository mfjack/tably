import { getOnlineOrderStatus } from "@/features/online-orders/actions";
import { jsonActionResult } from "@/lib/api/route-responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/public/online-orders/[onlineOrderId]">,
) {
  const { onlineOrderId } = await params;
  return jsonActionResult(await getOnlineOrderStatus(onlineOrderId));
}
