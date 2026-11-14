import { filterBySearch } from "@/lib/search";
import type { OrderDetails } from "./types";

export function filterOrdersBySearch(
  orders: readonly OrderDetails[],
  searchTerm: string,
): readonly OrderDetails[] {
  return filterBySearch(orders, searchTerm, (order) => [
    order.customerName,
    order.tableNumber === null ? null : String(order.tableNumber),
  ]);
}
