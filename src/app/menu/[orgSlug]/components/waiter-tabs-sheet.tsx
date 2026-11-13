"use client";

import { ArrowLeft, ClipboardList } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { OpenOrderTabCard } from "@/features/orders/components/order-tabs/open-order-tab-card";
import { OrderItemsList } from "@/features/orders/components/order-tabs/order-items-list";
import { useOpenOrderTabsQuery } from "@/features/orders/hooks/use-open-order-tabs-query";
import { useOrdersRealtime } from "@/features/orders/hooks/use-orders-realtime";
import type { OrderId } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useNow } from "@/hooks/use-now";
import { formatCurrency } from "@/lib/format";

const CLOCK_REFRESH_IN_MS = 30 * 1000;
const LOADING_CARD_COUNT = 3;

type WaiterTabsSheetProps = {
  organizationId: OrganizationId;
};

export function WaiterTabsSheet({ organizationId }: WaiterTabsSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<OrderId | null>(null);
  const openTabsQuery = useOpenOrderTabsQuery(organizationId, isOpen);
  useOrdersRealtime(organizationId);
  const now = useNow(CLOCK_REFRESH_IN_MS);
  const openTabs = openTabsQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const visibleTabs = normalizedSearch
    ? openTabs.filter((order) =>
        (order.customerName ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
      )
    : openTabs;
  const selectedOrder =
    openTabs.find((order) => order.id === selectedOrderId) ?? null;

  function changeOpen(isSheetOpen: boolean) {
    setIsOpen(isSheetOpen);
    if (!isSheetOpen) setSelectedOrderId(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-full"
        onClick={() => setIsOpen(true)}
      >
        <ClipboardList aria-hidden />
        Comandas
      </Button>
      <Sheet open={isOpen} onOpenChange={changeOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl"
        >
          {selectedOrder ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedOrder.customerName}</SheetTitle>
                <SheetDescription>
                  Total {formatCurrency(selectedOrder.total)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <OrderItemsList order={selectedOrder} />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 self-start"
                  onClick={() => setSelectedOrderId(null)}
                >
                  <ArrowLeft aria-hidden />
                  Voltar para as comandas
                </Button>
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Comandas abertas</SheetTitle>
                <SheetDescription>
                  Toque numa comanda para ver os itens.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pb-6">
                {openTabs.length > 0 && (
                  <SearchInput
                    label="Buscar comanda pelo nome ou mesa"
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                )}
                {openTabsQuery.isPending ? (
                  Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
                    <Skeleton
                      key={`loading-${index.toString()}`}
                      className="h-28 rounded-2xl"
                    />
                  ))
                ) : visibleTabs.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground text-sm">
                    {normalizedSearch
                      ? "Nenhuma comanda com esse nome."
                      : "Nenhuma comanda aberta."}
                  </p>
                ) : (
                  visibleTabs.map((order) => (
                    <OpenOrderTabCard
                      key={order.id}
                      order={order}
                      now={now}
                      onSelect={setSelectedOrderId}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
