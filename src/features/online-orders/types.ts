import type { OrderId } from "@/features/orders/types";
import type { ProductId } from "@/features/products/types";
import type { Brand } from "@/lib/brand";

export type OnlineOrderId = Brand<string, "OnlineOrderId">;

export type OnlineOrderDeviceId = Brand<string, "OnlineOrderDeviceId">;

export const ONLINE_ORDER_STAGES = [
  "pending",
  "waiting",
  "preparing",
  "ready",
  "delivered",
  "rejected",
] as const;

export type OnlineOrderStage = (typeof ONLINE_ORDER_STAGES)[number];

export const FINAL_ONLINE_ORDER_STAGES = [
  "delivered",
  "rejected",
] as const satisfies readonly OnlineOrderStage[];

export type OnlineOrderItem = {
  productId: ProductId;
  name: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
};

export type PendingOnlineOrder = {
  id: OnlineOrderId;
  customerName: string;
  note: string | null;
  total: number;
  createdAt: string;
  items: OnlineOrderItem[];
};

export type PublicOnlineOrder = {
  menuSlug: string;
  menuTitle: string;
  customerName: string;
  note: string | null;
  total: number;
  createdAt: string;
  stage: OnlineOrderStage;
  items: OnlineOrderItem[];
};

export type AcceptedOnlineOrder = {
  orderId: OrderId;
  customerName: string;
};
