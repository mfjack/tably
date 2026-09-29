import type { ProductId } from "@/features/products/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type OrderId = Brand<string, "OrderId">;

export type OrderItemId = Brand<string, "OrderItemId">;

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export type PlacedOrder = {
  id: OrderId;
  number: number;
  total: number;
};

export type OrderItem = {
  id: OrderItemId;
  productId: ProductId | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OrderDetails = {
  id: OrderId;
  customerName: string | null;
  isTakeaway: boolean;
  note: string | null;
  subtotal: number;
  takeawayFee: number;
  total: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  amountReceived: number | null;
  attendantName: string | null;
  cashierName: string | null;
  items: OrderItem[];
};

export type OrderTabTarget = {
  orderId: OrderId;
  customerName: string;
};
