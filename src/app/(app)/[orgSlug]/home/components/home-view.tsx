"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  ListChecks,
  PackageCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type PayableEntry,
  PayEntryDialog,
} from "@/features/finance/components/pay-entry-dialog";
import type {
  DuePayable,
  DuePayablesSummary,
} from "@/features/finance/due-payables";
import type {
  ExpiringIngredient,
  HomeOverview,
  PendingTask,
} from "@/features/home/overview";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import { buildOrganizationPath } from "@/features/modules/app-modules";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { ReceivePurchaseOrderDialog } from "@/features/purchase-orders/components/receive-purchase-order-dialog";
import type { PurchaseOrder } from "@/features/purchase-orders/types";
import { useSetTaskDoneMutation } from "@/features/tasks/hooks/use-set-task-done-mutation";
import { formatCurrency } from "@/lib/format";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { HomeCard } from "./home-card";
import { HomeShoppingList } from "./home-shopping-list";

type HomeViewProps = {
  title: string;
  organizationId: OrganizationId;
  organizationSlug: string;
  canManage: boolean;
  business: OrderTicketBusiness;
  overview: HomeOverview;
};

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinParts(parts: readonly (string | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function describePayables(summary: DuePayablesSummary): string {
  return joinParts([
    summary.overdueCount > 0 &&
      pluralize(summary.overdueCount, "atrasada", "atrasadas"),
    summary.dueTodayCount > 0 &&
      pluralize(summary.dueTodayCount, "vence hoje", "vencem hoje"),
    summary.dueTomorrowCount > 0 &&
      pluralize(summary.dueTomorrowCount, "vence amanhã", "vencem amanhã"),
  ]);
}

function describeDueDate(entry: DuePayable, summary: DuePayablesSummary) {
  if (entry.dueDate === summary.today) return "Vence hoje";
  if (entry.dueDate === summary.tomorrow) return "Vence amanhã";
  const daysLate = differenceInCalendarDays(
    parseISO(summary.today),
    parseISO(entry.dueDate),
  );
  return `Atrasada há ${pluralize(daysLate, "dia", "dias")}`;
}

function describePayableLabel(entry: DuePayable): string {
  return entry.installmentNumber && entry.installmentCount
    ? `${entry.description} (${entry.installmentNumber}/${entry.installmentCount})`
    : entry.description;
}

function describeExpiry({ expiry }: ExpiringIngredient): string {
  if (expiry.status === "expired") return "Vencido";
  if (expiry.daysLeft === 0) return "Vence hoje";
  if (expiry.daysLeft === 1) return "Vence amanhã";
  return `Vence em ${expiry.daysLeft} dias`;
}

function describeOrderItems(order: PurchaseOrder): string {
  return order.items
    .map(
      (item) =>
        `${formatItemQuantity(item.quantity, item.unit)} de ${item.ingredientName}`,
    )
    .join(", ");
}

export function HomeView({
  title,
  organizationId,
  organizationSlug,
  canManage,
  business,
  overview,
}: HomeViewProps) {
  const { payables, stock, pendingTasks, openTabs } = overview;
  const router = useRouter();
  const [entryToPay, setEntryToPay] = useState<PayableEntry | null>(null);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(
    null,
  );
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const setTaskDoneMutation = useSetTaskDoneMutation(organizationId);

  function refreshOverview() {
    router.refresh();
  }

  function completeTask(taskId: PendingTask["id"]) {
    setTaskDoneMutation.mutate(
      { taskId, isDone: true },
      {
        onSuccess: () => {
          toast.success("Tarefa concluída.");
          refreshOverview();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const buildPath = (path: string) =>
    buildOrganizationPath(organizationSlug, path);
  const overdueTaskCount =
    pendingTasks?.filter((task) => task.isOverdue).length ?? 0;
  const openTabsTotal =
    openTabs?.reduce((total, openTab) => total + openTab.total, 0) ?? 0;

  const cards = [
    payables && payables.entries.length > 0 && (
      <HomeCard
        key="payables"
        icon={Wallet}
        title="Contas a pagar"
        summary={describePayables(payables)}
        href={`${buildPath("finance")}?tab=payables`}
        tone={payables.overdueCount > 0 ? "urgent" : "attention"}
        rows={payables.entries.map((entry) => ({
          id: entry.id,
          label: describePayableLabel(entry),
          detail: describeDueDate(entry, payables),
          value: formatCurrency(entry.amount),
          isHighlighted: entry.dueDate < payables.today,
          action: (
            <Button size="sm" onClick={() => setEntryToPay(entry)}>
              Pagar
            </Button>
          ),
        }))}
        footer={
          <span className="font-medium text-foreground">
            Total {formatCurrency(payables.totalAmount)}
          </span>
        }
      />
    ),
    stock && stock.ingredientsToBuy.length > 0 && (
      <HomeCard
        key="to-buy"
        icon={ShoppingCart}
        title="Hora de comprar"
        summary={`${pluralize(stock.ingredientsToBuy.length, "insumo abaixo", "insumos abaixo")} do mínimo`}
        href={buildPath("ingredients")}
        tone="attention"
        rows={stock.ingredientsToBuy.map((ingredient) => ({
          id: ingredient.id,
          label: ingredient.name,
          value: `${formatItemQuantity(ingredient.currentStock, ingredient.unit)} / ${formatItemQuantity(ingredient.minimumStock, ingredient.unit)}`,
        }))}
        footer={
          <>
            <span>tem / mínimo</span>
            <Button size="sm" onClick={() => setIsShoppingListOpen(true)}>
              <ShoppingCart aria-hidden />
              Fazer pedido
            </Button>
          </>
        }
      />
    ),
    stock && stock.expiringIngredients.length > 0 && (
      <HomeCard
        key="expiring"
        icon={CalendarClock}
        title="Validade"
        summary={pluralize(
          stock.expiringIngredients.length,
          "insumo vencendo",
          "insumos vencendo",
        )}
        href={buildPath("ingredients")}
        tone={
          stock.expiringIngredients.some(
            ({ expiry }) => expiry.status === "expired",
          )
            ? "urgent"
            : "attention"
        }
        rows={stock.expiringIngredients.map((ingredient) => ({
          id: ingredient.id,
          label: ingredient.name,
          detail: describeExpiry(ingredient),
          isHighlighted: ingredient.expiry.status === "expired",
        }))}
      />
    ),
    stock && stock.awaitingDeliveryOrders.length > 0 && (
      <HomeCard
        key="awaiting-delivery"
        icon={Truck}
        title="Aguardando entrega"
        summary={pluralize(
          stock.awaitingDeliveryOrders.length,
          "pedido de compra",
          "pedidos de compra",
        )}
        href={buildPath("ingredients")}
        tone="neutral"
        rows={stock.awaitingDeliveryOrders.map((order) => ({
          id: order.id,
          label: order.supplierName ?? "Sem fornecedor",
          detail: describeOrderItems(order),
          value: order.orderedOn,
          action: canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOrderToReceive(order)}
            >
              <PackageCheck aria-hidden />
              Receber
            </Button>
          ),
        }))}
      />
    ),
    pendingTasks && pendingTasks.length > 0 && (
      <HomeCard
        key="tasks"
        icon={ListChecks}
        title="Tarefas"
        summary={joinParts([
          pluralize(pendingTasks.length, "pendente", "pendentes"),
          overdueTaskCount > 0 &&
            pluralize(overdueTaskCount, "atrasada", "atrasadas"),
        ])}
        href={buildPath("tasks")}
        tone={overdueTaskCount > 0 ? "urgent" : "neutral"}
        rows={pendingTasks.map((task) => ({
          id: task.id,
          label: task.title,
          detail: task.isOverdue
            ? `${task.listName} · atrasada`
            : task.listName,
          isHighlighted: task.isOverdue,
          leading: (
            <Checkbox
              checked={
                setTaskDoneMutation.isPending &&
                setTaskDoneMutation.variables?.taskId === task.id
              }
              disabled={setTaskDoneMutation.isPending}
              onCheckedChange={() => completeTask(task.id)}
              aria-label={`Concluir ${task.title}`}
            />
          ),
        }))}
      />
    ),
    openTabs && openTabs.length > 0 && (
      <HomeCard
        key="open-tabs"
        icon={ClipboardList}
        title="Comandas abertas"
        summary={pluralize(openTabs.length, "comanda", "comandas")}
        href={buildPath("order-tabs")}
        tone="neutral"
        rows={openTabs.map((openTab) => ({
          id: openTab.id,
          label: openTab.customerName,
          detail: `Aberta às ${openTab.openedAt}`,
          value: formatCurrency(openTab.total),
        }))}
        footer={
          <span className="font-medium text-foreground">
            Total {formatCurrency(openTabsTotal)}
          </span>
        }
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <PageHeader title={title} description="O que precisa da sua atenção." />
      <PageContent>
        {cards.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <CircleCheck className="size-10 text-primary" aria-hidden />
            <p className="font-semibold">Tudo em dia</p>
            <p className="text-muted-foreground text-sm">
              Nenhuma pendência por aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards}
          </div>
        )}
      </PageContent>
      {payables && (
        <PayEntryDialog
          organizationId={organizationId}
          entry={entryToPay}
          today={payables.today}
          onClose={() => {
            setEntryToPay(null);
            refreshOverview();
          }}
        />
      )}
      {orderToReceive && (
        <ReceivePurchaseOrderDialog
          organizationId={organizationId}
          order={orderToReceive}
          onClose={() => {
            setOrderToReceive(null);
            refreshOverview();
          }}
        />
      )}
      {isShoppingListOpen && (
        <HomeShoppingList
          organizationId={organizationId}
          canManage={canManage}
          business={business}
          onClose={() => {
            setIsShoppingListOpen(false);
            refreshOverview();
          }}
        />
      )}
    </>
  );
}
