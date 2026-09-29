"use server";

import type { OrganizationId } from "@/features/organizations/types";
import type { ProductId } from "@/features/products/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { getOrderErrorMessage } from "./messages";
import {
  type OrderItemInput,
  type OrderPaymentInput,
  orderItemSchema,
  orderPaymentSchema,
} from "./schemas";
import type {
  OrderDetails,
  OrderId,
  OrderItemId,
  PaymentMethod,
} from "./types";

const ORDER_DETAILS_COLUMNS = `
  id, customer_name, is_takeaway, note, subtotal, takeaway_fee, total,
  created_at, paid_at, payment_method, amount_received,
  attendant:profiles!orders_created_by_profile_fkey(full_name),
  cashier:profiles!orders_paid_by_profile_fkey(full_name),
  order_items(id, product_id, product_name, quantity, unit_price)
`;

const PAID_ORDERS_LIMIT = 200;

type OrderDetailsRow = {
  id: string;
  customer_name: string | null;
  is_takeaway: boolean;
  note: string | null;
  subtotal: number;
  takeaway_fee: number;
  total: number;
  created_at: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  amount_received: number | null;
  attendant: { full_name: string | null } | null;
  cashier: { full_name: string | null } | null;
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

function toOrderDetails(row: OrderDetailsRow): OrderDetails {
  return {
    id: row.id as OrderId,
    customerName: row.customer_name,
    isTakeaway: row.is_takeaway,
    note: row.note,
    subtotal: row.subtotal,
    takeawayFee: row.takeaway_fee,
    total: row.total,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method,
    amountReceived: row.amount_received,
    attendantName: row.attendant?.full_name ?? null,
    cashierName: row.cashier?.full_name ?? null,
    items: row.order_items
      .map((item) => ({
        id: item.id as OrderItemId,
        productId: item.product_id as ProductId | null,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.unit_price * item.quantity,
      }))
      .sort((first, second) =>
        first.productName.localeCompare(second.productName, "pt-BR"),
      ),
  };
}

export async function listOpenOrderTabs(
  organizationId: OrganizationId,
): Promise<ActionResult<OrderDetails[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAILS_COLUMNS)
    .eq("organization_id", organizationId)
    .is("paid_at", null)
    .neq("status", "canceled")
    .not("customer_name", "is", null)
    .order("created_at")
    .overrideTypes<OrderDetailsRow[], { merge: false }>();

  if (error) return actionFailure("Não foi possível carregar as comandas.");

  return actionSuccess(data.map(toOrderDetails));
}

export async function listPaidOrders(
  organizationId: OrganizationId,
): Promise<ActionResult<OrderDetails[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAILS_COLUMNS)
    .eq("organization_id", organizationId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(PAID_ORDERS_LIMIT)
    .overrideTypes<OrderDetailsRow[], { merge: false }>();

  if (error) return actionFailure("Não foi possível carregar o histórico.");

  return actionSuccess(data.map(toOrderDetails));
}

export async function addOrderItems(
  orderId: OrderId,
  items: OrderItemInput[],
  note?: string,
): Promise<ActionResult> {
  const parsedItems = orderItemSchema.array().min(1).safeParse(items);
  if (!parsedItems.success)
    return actionFailure("Adicione produtos à comanda.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_order_items", {
    p_order_id: orderId,
    p_items: parsedItems.data.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    p_note: note?.trim().slice(0, 500),
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível adicionar os produtos."),
    );
  }
  return actionSuccess();
}

export async function removeOrderItem(
  orderItemId: OrderItemId,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_order_item", {
    p_order_item_id: orderItemId,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível remover o item."),
    );
  }
  return actionSuccess();
}

export async function payOrder(
  orderId: OrderId,
  payment: OrderPaymentInput,
): Promise<ActionResult> {
  const parsedPayment = orderPaymentSchema.safeParse(payment);
  if (!parsedPayment.success) {
    return actionFailure("Escolha a forma de pagamento.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_order", {
    p_order_id: orderId,
    p_payment_method: parsedPayment.data.method,
    p_amount_received: parsedPayment.data.amountReceived,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível registrar o pagamento."),
    );
  }
  return actionSuccess();
}

export async function cancelOrder(orderId: OrderId): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
  });

  if (error) {
    return actionFailure(
      getOrderErrorMessage(error, "Não foi possível cancelar a comanda."),
    );
  }
  return actionSuccess();
}
