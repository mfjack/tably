import { useMemo } from "react";
import type {
  OrderDetails,
  OrderId,
  OrderItemId,
} from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type QueuedOrder,
  type QueuedPlaceOrder,
  useOfflineOrderQueue,
} from "../offline-order-queue";

function isPendingTab(
  queuedOrder: QueuedOrder,
  organizationId: OrganizationId,
): queuedOrder is QueuedPlaceOrder {
  return (
    queuedOrder.kind === "place-order" &&
    queuedOrder.organizationId === organizationId &&
    queuedOrder.customerName !== null &&
    !queuedOrder.input.payments?.length
  );
}

function toPendingTab(queuedOrder: QueuedPlaceOrder): OrderDetails {
  const items = (queuedOrder.previewItems ?? []).map((item, index) => ({
    id: `${queuedOrder.requestId}-${index}` as OrderItemId,
    productId: null,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    basePrice: item.unitPrice,
    addonNames: item.addonNames,
    note: item.note,
    total: item.total,
  }));
  const subtotal = items.reduce((total, item) => total + item.total, 0);

  return {
    id: queuedOrder.requestId as string as OrderId,
    customerName: queuedOrder.customerName,
    tableNumber: null,
    isTakeaway: queuedOrder.input.customer?.isTakeaway ?? false,
    note: queuedOrder.input.note || null,
    subtotal,
    takeawayFee: Math.max(queuedOrder.total - subtotal, 0),
    serviceFee: 0,
    discount: 0,
    loyaltyReward: 0,
    total: queuedOrder.total,
    createdAt: queuedOrder.placedAt,
    paidAt: null,
    isFromMenu: false,
    payments: [],
    attendantName: null,
    cashierName: null,
    items,
    isPendingSync: true,
  };
}

export function usePendingQueuedTabs(organizationId: OrganizationId) {
  const queuedOrders = useOfflineOrderQueue((state) => state.queuedOrders);

  return useMemo(() => {
    const pendingTabs = queuedOrders
      .filter((queuedOrder) => isPendingTab(queuedOrder, organizationId))
      .map(toPendingTab);
    const paidOrderIds = new Set<string>(
      queuedOrders.flatMap((queuedOrder) =>
        queuedOrder.kind === "pay-order" &&
        queuedOrder.organizationId === organizationId
          ? [queuedOrder.orderId]
          : [],
      ),
    );
    return { pendingTabs, paidOrderIds };
  }, [queuedOrders, organizationId]);
}
