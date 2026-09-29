import type { OrderId } from "@/features/orders/types";
import type { Brand } from "@/lib/brand";
import type { Database } from "@/lib/supabase/database.types";

export type KitchenTicketId = Brand<string, "KitchenTicketId">;

export type KitchenTicketStatus =
  Database["public"]["Enums"]["kitchen_ticket_status"];

export type ActiveKitchenTicketStatus = Exclude<
  KitchenTicketStatus,
  "delivered"
>;

export type KitchenTicketItem = {
  id: string;
  productName: string;
  quantity: number;
};

export type KitchenTicket = {
  id: KitchenTicketId;
  orderId: OrderId;
  status: ActiveKitchenTicketStatus;
  customerName: string | null;
  isTakeaway: boolean;
  isAddition: boolean;
  note: string | null;
  createdAt: string;
  readyAt: string | null;
  items: KitchenTicketItem[];
};
