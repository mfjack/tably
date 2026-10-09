import "server-only";

import {
  type DuePayablesSummary,
  getDuePayablesSummary,
} from "@/features/finance/due-payables";
import { listIngredients } from "@/features/ingredients/actions";
import {
  type ExpiryStatus,
  getExpiryStatus,
} from "@/features/ingredients/expiry";
import { needsPurchase } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import { listOpenOrderTabs } from "@/features/orders/tab-actions";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { listPendingPurchaseOrders } from "@/features/purchase-orders/actions";
import type { PurchaseOrder } from "@/features/purchase-orders/types";
import { listTaskLists } from "@/features/tasks/actions";
import { isTaskOverdue } from "@/features/tasks/task-schedule";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export type IngredientToBuy = Pick<
  Ingredient,
  "id" | "name" | "unit" | "currentStock" | "minimumStock"
>;

export type ExpiringIngredient = Pick<Ingredient, "id" | "name"> & {
  expiry: Extract<ExpiryStatus, { status: "expired" | "expiring" }>;
};

export type AwaitingDeliveryOrder = PurchaseOrder & { orderedOn: string };

export type StockOverview = {
  ingredientsToBuy: IngredientToBuy[];
  awaitingDeliveryOrders: AwaitingDeliveryOrder[];
  expiringIngredients: ExpiringIngredient[];
};

export type PendingTask = {
  id: string;
  title: string;
  listName: string;
  isOverdue: boolean;
};

export type OpenTab = {
  id: string;
  customerName: string;
  total: number;
  createdAt: string;
  openedAt: string;
};

export type HomeOverview = {
  payables: DuePayablesSummary | null;
  stock: StockOverview | null;
  pendingTasks: PendingTask[] | null;
  openTabs: OpenTab[] | null;
};

function getExpiryOrder({ expiry }: ExpiringIngredient): number {
  return expiry.status === "expiring" ? expiry.daysLeft : -1;
}

type DateFormatters = {
  formatDay: (date: string) => string;
  formatTime: (date: string) => string;
};

async function getDateFormatters(
  organizationId: OrganizationId,
): Promise<DateFormatters> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("timezone")
    .eq("id", organizationId)
    .maybeSingle();
  const timeZone = data?.timezone ?? DEFAULT_TIME_ZONE;
  const dayFormat = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
  });
  const timeFormat = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return {
    formatDay: (date) => dayFormat.format(new Date(date)),
    formatTime: (date) => timeFormat.format(new Date(date)),
  };
}

async function getStockOverview(
  organizationId: OrganizationId,
  { formatDay }: DateFormatters,
): Promise<StockOverview | null> {
  const [ingredientsResult, ordersResult] = await Promise.all([
    listIngredients(organizationId),
    listPendingPurchaseOrders(organizationId),
  ]);
  if (ingredientsResult.status === "error") return null;

  const awaitingDeliveryOrders =
    ordersResult.status === "success"
      ? ordersResult.data.map((order) => ({
          ...order,
          orderedOn: formatDay(order.createdAt),
        }))
      : [];
  const pendingIngredientIds = new Set(
    awaitingDeliveryOrders.flatMap((order) =>
      order.items.map((item) => item.ingredientId),
    ),
  );
  const ingredients = ingredientsResult.data;

  return {
    ingredientsToBuy: ingredients
      .filter(
        (ingredient) =>
          needsPurchase(ingredient) && !pendingIngredientIds.has(ingredient.id),
      )
      .map(({ id, name, unit, currentStock, minimumStock }) => ({
        id,
        name,
        unit,
        currentStock,
        minimumStock,
      })),
    awaitingDeliveryOrders,
    expiringIngredients: ingredients
      .flatMap((ingredient): ExpiringIngredient[] => {
        const expiry = getExpiryStatus(ingredient.expiresAt);
        return expiry.status === "expired" || expiry.status === "expiring"
          ? [{ id: ingredient.id, name: ingredient.name, expiry }]
          : [];
      })
      .sort((first, second) => getExpiryOrder(first) - getExpiryOrder(second)),
  };
}

async function getPendingTasks(
  organizationId: OrganizationId,
): Promise<PendingTask[] | null> {
  const result = await listTaskLists(organizationId);
  if (result.status === "error") return null;

  const { today, taskLists } = result.data;
  return taskLists
    .flatMap((taskList) =>
      taskList.tasks
        .filter((task) => !task.completion)
        .map((task) => ({
          id: task.id,
          title: task.title,
          listName: taskList.name,
          isOverdue: isTaskOverdue(task, today),
        })),
    )
    .sort(
      (first, second) => Number(second.isOverdue) - Number(first.isOverdue),
    );
}

async function getOpenTabs(
  organizationId: OrganizationId,
  { formatTime }: DateFormatters,
): Promise<OpenTab[] | null> {
  const result = await listOpenOrderTabs(organizationId);
  if (result.status === "error") return null;

  return result.data
    .map((order) => ({
      id: order.id,
      customerName: order.customerName ?? "",
      total: order.total,
      createdAt: order.createdAt,
      openedAt: formatTime(order.createdAt),
    }))
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

function whenAccessible<T>(
  accessibleModuleIds: readonly AppModuleId[],
  moduleId: AppModuleId,
  load: () => Promise<T | null>,
): Promise<T | null> {
  return accessibleModuleIds.includes(moduleId)
    ? load()
    : Promise.resolve(null);
}

export async function getHomeOverview(
  organizationId: OrganizationId,
  accessibleModuleIds: readonly AppModuleId[],
): Promise<HomeOverview> {
  const dateFormatters = await getDateFormatters(organizationId);
  const [payables, stock, pendingTasks, openTabs] = await Promise.all([
    whenAccessible(accessibleModuleIds, "finance", () =>
      getDuePayablesSummary(organizationId),
    ),
    whenAccessible(accessibleModuleIds, "ingredients", () =>
      getStockOverview(organizationId, dateFormatters),
    ),
    whenAccessible(accessibleModuleIds, "tasks", () =>
      getPendingTasks(organizationId),
    ),
    whenAccessible(accessibleModuleIds, "order_tabs", () =>
      getOpenTabs(organizationId, dateFormatters),
    ),
  ]);

  return { payables, stock, pendingTasks, openTabs };
}
