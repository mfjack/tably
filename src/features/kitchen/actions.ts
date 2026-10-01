"use server";

import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import type {
  ActiveKitchenTicketStatus,
  KitchenTicket,
  KitchenTicketId,
  KitchenTicketStatus,
} from "./types";

const KITCHEN_TICKET_COLUMNS = `
  id, order_id, status, note, is_addition, created_at, ready_at,
  order:orders!inner(customer_name, is_takeaway, status),
  kitchen_ticket_items(id, product_name, quantity, note)
`;

const ACTIVE_STATUSES = [
  "preparing",
  "ready",
] as const satisfies readonly ActiveKitchenTicketStatus[];

type KitchenTicketRow = {
  id: string;
  order_id: string;
  status: ActiveKitchenTicketStatus;
  note: string | null;
  is_addition: boolean;
  created_at: string;
  ready_at: string | null;
  order: { customer_name: string | null; is_takeaway: boolean };
  kitchen_ticket_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    note: string | null;
  }>;
};

function toKitchenTicket(row: KitchenTicketRow): KitchenTicket {
  return {
    id: row.id as KitchenTicketId,
    orderId: row.order_id as OrderId,
    status: row.status,
    customerName: row.order.customer_name,
    isTakeaway: row.order.is_takeaway,
    isAddition: row.is_addition,
    note: row.note,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    items: row.kitchen_ticket_items
      .map((item) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        note: item.note,
      }))
      .sort((first, second) =>
        first.productName.localeCompare(second.productName, "pt-BR"),
      ),
  };
}

export async function listActiveKitchenTickets(
  organizationId: OrganizationId,
): Promise<ActionResult<KitchenTicket[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kitchen_tickets")
    .select(KITCHEN_TICKET_COLUMNS)
    .eq("organization_id", organizationId)
    .in("status", ACTIVE_STATUSES)
    .neq("order.status", "canceled")
    .order("created_at")
    .overrideTypes<KitchenTicketRow[], { merge: false }>();

  if (error) return actionFailure("Não foi possível carregar os pedidos.");

  return actionSuccess(data.map(toKitchenTicket));
}

export async function setKitchenTicketStatus(
  ticketId: KitchenTicketId,
  status: KitchenTicketStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_kitchen_ticket_status", {
    p_ticket_id: ticketId,
    p_status: status,
  });

  if (error) {
    return actionFailure(
      error.code === "P0002"
        ? "Esse pedido não existe mais. Atualize a tela."
        : "Não foi possível atualizar o pedido.",
    );
  }
  return actionSuccess();
}
