"use server";

import {
  hasModuleAccess,
  hasModuleAccessToRecord,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import { parseOrderItemAddons } from "@/features/product-addons/item-addons";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
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
  order:orders!inner(customer_name, is_takeaway, takeaway_fee, status),
  kitchen_ticket_items(id, product_name, quantity, unit_price, note, sort_order, addons)
`;

const ACTIVE_STATUSES = [
  "waiting",
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
  order: {
    customer_name: string | null;
    is_takeaway: boolean;
    takeaway_fee: number;
  };
  kitchen_ticket_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    note: string | null;
    sort_order: number;
    addons: unknown;
  }>;
};

function toKitchenTicket(row: KitchenTicketRow): KitchenTicket {
  return {
    id: row.id as KitchenTicketId,
    orderId: row.order_id as OrderId,
    status: row.status,
    customerName: row.order.customer_name,
    isTakeaway: row.order.is_takeaway,
    takeawayFee: row.order.takeaway_fee,
    isAddition: row.is_addition,
    note: row.note,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    items: [...row.kitchen_ticket_items]
      .sort(
        (first, second) =>
          first.sort_order - second.sort_order ||
          first.product_name.localeCompare(second.product_name, "pt-BR"),
      )
      .map((item) => ({
        id: item.id,
        productName: item.product_name,
        addonNames: parseOrderItemAddons(item.addons).map(
          (addon) => addon.name,
        ),
        quantity: item.quantity,
        unitPrice: item.unit_price,
        note: item.note,
      })),
  };
}

export async function listActiveKitchenTickets(
  organizationId: OrganizationId,
): Promise<ActionResult<KitchenTicket[]>> {
  if (!(await hasModuleAccess(organizationId, "kitchen"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kitchen_tickets")
    .select(KITCHEN_TICKET_COLUMNS)
    .eq("organization_id", organizationId)
    .in("status", ACTIVE_STATUSES)
    .neq("order.status", "canceled")
    .order("created_at")
    .overrideTypes<KitchenTicketRow[], { merge: false }>();

  if (error)
    return databaseFailure("Não foi possível carregar os pedidos.", error);

  return actionSuccess(data.map(toKitchenTicket));
}

export async function setKitchenTicketStatus(
  ticketId: KitchenTicketId,
  status: KitchenTicketStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("kitchen_tickets")
    .select("organization_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!(await hasModuleAccessToRecord(ticket?.organization_id, "kitchen"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
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
