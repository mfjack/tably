export function buildOrderPath(menuSlug: string, onlineOrderId: string) {
  return `/menu/${menuSlug}/orders/${onlineOrderId}`;
}
