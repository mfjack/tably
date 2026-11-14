import {
  type CategoryOrder,
  sortByCategoryOrder,
} from "@/features/categories/category-order";
import {
  type Cart,
  type CartTab,
  getCartTabLabel,
} from "@/features/pos/cart-store";
import type {
  GroupOrderConfirmation,
  GroupOrderEntry,
} from "./components/group-orders-dialog";
import type { CartLine } from "./hooks/use-pos-catalog";
import type { TabOrderGroup } from "./hooks/use-pos-checkout";

type BuildCartLines = (items: Cart["items"]) => CartLine[];

export function buildGroupOrderEntries(
  tabs: readonly CartTab[],
  buildCartLines: BuildCartLines,
): GroupOrderEntry[] {
  return tabs.map((tab) => {
    const tabLines = buildCartLines(tab.items);
    return {
      cartTabId: tab.id,
      label: getCartTabLabel(tab),
      defaultName: tab.name,
      itemCount: tabLines.reduce((count, line) => count + line.quantity, 0),
      total: tabLines.reduce((total, line) => total + line.total, 0),
    };
  });
}

type BuildTabOrderGroupsOptions = {
  entries: readonly GroupOrderEntry[];
  tabs: readonly CartTab[];
  orders: readonly GroupOrderConfirmation[];
  isAllTakeaway: boolean;
  takeawayFee: number;
  categoryOrder: CategoryOrder;
  buildCartLines: BuildCartLines;
};

export function buildTabOrderGroups({
  entries,
  tabs,
  orders,
  isAllTakeaway,
  takeawayFee,
  categoryOrder,
  buildCartLines,
}: BuildTabOrderGroupsOptions): TabOrderGroup[] {
  return entries.map((entry, index) => {
    const tab = tabs.find(({ id }) => id === entry.cartTabId);
    const order = orders[index];
    const isTakeaway = order?.isTakeaway ?? false;
    const isTakeawayCharged = isAllTakeaway ? index === 0 : isTakeaway;
    return {
      cartTabIds: [entry.cartTabId],
      customerName: order?.customerName ?? entry.label,
      isTakeaway: isAllTakeaway || isTakeaway,
      isTakeawayCharged,
      takeawayFee: isTakeawayCharged ? takeawayFee : 0,
      cartLines: sortByCategoryOrder(
        buildCartLines(tab?.items ?? []),
        (cartLine) => cartLine.product.categoryId,
        categoryOrder,
      ),
    };
  });
}
