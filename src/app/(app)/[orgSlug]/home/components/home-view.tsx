"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  CalendarClock,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  FolderOpen,
  Landmark,
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
import { CloseCashRegisterDialog } from "@/features/cash-register/components/close-cash-register-dialog";
import { DOCUMENT_KIND_LABELS } from "@/features/documents/document-kinds";
import {
  type PayableEntry,
  PayEntryDialog,
} from "@/features/finance/components/pay-entry-dialog";
import type {
  DuePayable,
  DuePayablesSummary,
} from "@/features/finance/due-payables";
import type {
  ExpiringDocument,
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
import type { SalesReport } from "@/features/sales-report/types";
import { useSetTaskDoneMutation } from "@/features/tasks/hooks/use-set-task-done-mutation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { HomeCard, type HomeCardRow } from "./home-card";
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

function describeExpiry({
  expiry,
}: Pick<ExpiringIngredient | ExpiringDocument, "expiry">): string {
  if (expiry.status === "expired") return "Vencido";
  if (expiry.daysLeft === 0) return "Vence hoje";
  if (expiry.daysLeft === 1) return "Vence amanhã";
  return `Vence em ${expiry.daysLeft} dias`;
}

const TOP_PRODUCT_COUNT = 3;

function buildSalesRows(sales: SalesReport): HomeCardRow[] {
  const { revenue, orderCount, cost } = sales.summary;
  const averageTicket = orderCount > 0 ? revenue / orderCount : 0;
  const topProducts = [...sales.products]
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, TOP_PRODUCT_COUNT);

  return [
    {
      id: "revenue",
      label: "Faturamento",
      detail: `Ontem: ${formatCurrency(sales.previousSummary.revenue)}`,
      value: formatCurrency(revenue),
    },
    {
      id: "orders",
      label: "Pedidos",
      detail: `Ontem: ${sales.previousSummary.orderCount}`,
      value: String(orderCount),
    },
    {
      id: "average-ticket",
      label: "Ticket médio",
      value: formatCurrency(averageTicket),
    },
    ...(cost > 0
      ? [
          {
            id: "gross-profit",
            label: "Lucro bruto",
            detail: "Faturamento menos o custo dos insumos",
            value: formatCurrency(revenue - cost),
          },
        ]
      : []),
    ...topProducts.map((product, index) => ({
      id: `product-${product.productId ?? product.productName}`,
      label: `${index + 1}º ${product.productName}`,
      detail: "Mais vendido",
      value: `${product.quantity} un`,
    })),
  ];
}

function describeOrderItems(order: PurchaseOrder): string {
  return order.items
    .map(
      (item) =>
        `${formatItemQuantity(item.quantity, item.unit)} de ${item.ingredientName}`,
    )
    .join(", ");
}

function AllClear({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-5 text-center",
        className,
      )}
    >
      <CircleCheck className="size-10 text-primary" aria-hidden />
      <p className="font-semibold">Tudo em dia</p>
      <p className="text-muted-foreground text-sm">
        Nenhuma pendência por aqui.
      </p>
    </div>
  );
}

export function HomeView({
  title,
  organizationId,
  organizationSlug,
  canManage,
  business,
  overview,
}: HomeViewProps) {
  const {
    todaySales,
    forgottenCashSession,
    payables,
    stock,
    pendingTasks,
    openTabs,
    expiringDocuments,
  } = overview;
  const router = useRouter();
  const [entryToPay, setEntryToPay] = useState<PayableEntry | null>(null);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(
    null,
  );
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isClosingCashRegister, setIsClosingCashRegister] = useState(false);
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
  const forgottenTabCount =
    openTabs?.filter((openTab) => openTab.isForgotten).length ?? 0;

  const cards = [
    forgottenCashSession && (
      <HomeCard
        key="forgotten-cash-session"
        icon={Landmark}
        title="Caixa não fechado"
        summary={`Aberto ${forgottenCashSession.openedLabel}`}
        href={buildPath("pos")}
        tone="urgent"
        rows={[
          {
            id: "opened-by",
            label: "Aberto por",
            value: forgottenCashSession.summary.openedByName ?? "—",
          },
          {
            id: "orders",
            label: "Vendas no caixa",
            value: String(forgottenCashSession.summary.orderCount),
          },
          {
            id: "received",
            label: "Total recebido",
            value: formatCurrency(forgottenCashSession.summary.receivedTotal),
          },
          {
            id: "expected-cash",
            label: "Dinheiro esperado na gaveta",
            value: formatCurrency(forgottenCashSession.summary.expectedCash),
          },
        ]}
        footer={
          <>
            <span>Feche para o relatório de hoje começar certo.</span>
            <Button size="sm" onClick={() => setIsClosingCashRegister(true)}>
              Fechar caixa
            </Button>
          </>
        }
      />
    ),
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
    expiringDocuments && expiringDocuments.length > 0 && (
      <HomeCard
        key="expiring-documents"
        icon={FolderOpen}
        title="Documentos vencendo"
        summary={pluralize(
          expiringDocuments.length,
          "documento precisa de atenção",
          "documentos precisam de atenção",
        )}
        href={buildPath("documents")}
        tone={
          expiringDocuments.some(({ expiry }) => expiry.status === "expired")
            ? "urgent"
            : "attention"
        }
        rows={expiringDocuments.map((document) => ({
          id: document.id,
          label: document.name,
          detail: `${DOCUMENT_KIND_LABELS[document.kind]} · ${describeExpiry(document)}`,
          isHighlighted: document.expiry.status === "expired",
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
        summary={joinParts([
          pluralize(openTabs.length, "comanda", "comandas"),
          forgottenTabCount > 0 &&
            pluralize(forgottenTabCount, "esquecida", "esquecidas"),
        ])}
        href={buildPath("order-tabs")}
        tone={forgottenTabCount > 0 ? "urgent" : "neutral"}
        rows={openTabs.map((openTab) => ({
          id: openTab.id,
          label: openTab.customerName,
          detail: `Aberta ${openTab.openedLabel}`,
          value: formatCurrency(openTab.total),
          isHighlighted: openTab.isForgotten,
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
        {cards.length === 0 && !todaySales ? (
          <AllClear className="flex-1" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {todaySales && (
              <HomeCard
                icon={ChartColumn}
                title="Vendas de hoje"
                summary={
                  todaySales.summary.orderCount > 0
                    ? `${formatCurrency(todaySales.summary.revenue)} em ${pluralize(todaySales.summary.orderCount, "pedido", "pedidos")}`
                    : "Nenhuma venda ainda hoje"
                }
                href={buildPath("sales-report")}
                tone="neutral"
                rows={buildSalesRows(todaySales)}
              />
            )}
            {cards.length > 0 ? (
              cards
            ) : (
              <AllClear className="h-80 rounded-xl border bg-card" />
            )}
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
      {forgottenCashSession && (
        <CloseCashRegisterDialog
          organizationId={organizationId}
          ticketBusiness={business}
          summary={forgottenCashSession.summary}
          isOpen={isClosingCashRegister}
          onClose={() => setIsClosingCashRegister(false)}
          onClosed={() => {
            setIsClosingCashRegister(false);
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
