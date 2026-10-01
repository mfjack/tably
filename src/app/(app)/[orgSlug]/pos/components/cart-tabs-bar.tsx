"use client";

import { Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  type CartTab,
  type CartTabId,
  getCartTabLabel,
} from "@/features/pos/cart-store";
import { cn } from "@/lib/utils";

const MAX_CART_TABS = 8;

type CartTabsBarProps = {
  tabs: readonly CartTab[];
  activeTabId: CartTabId | null;
  onSelect: (tabId: CartTabId) => void;
  onRename: (tab: CartTab) => void;
  onAdd: () => void;
  onRemove: (tabId: CartTabId) => void;
};

function countItems(tab: CartTab) {
  return tab.items.reduce((count, item) => count + item.quantity, 0);
}

function canCloseTab(tab: CartTab, tabCount: number) {
  return tabCount > 1 || countItems(tab) > 0 || tab.name !== "";
}

export function CartTabsBar({
  tabs,
  activeTabId,
  onSelect,
  onRename,
  onAdd,
  onRemove,
}: CartTabsBarProps) {
  const [tabToRemove, setTabToRemove] = useState<CartTab | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [firstTab] = tabs;
  const hasNamedOrders =
    tabs.length > 1 || (firstTab !== undefined && firstTab.name !== "");

  useEffect(() => {
    if (!activeTabId) return;
    const activeTab = tabListRef.current?.querySelector(
      `[data-tab-id="${activeTabId}"]`,
    );
    activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  function requestRemove(tab: CartTab) {
    if (countItems(tab) === 0) {
      onRemove(tab.id);
      return;
    }
    setTabToRemove(tab);
  }

  function confirmRemove() {
    if (tabToRemove) onRemove(tabToRemove.id);
    setTabToRemove(null);
  }

  function handleTabClick(tab: CartTab) {
    if (tab.id === activeTabId) {
      onRename(tab);
      return;
    }
    onSelect(tab.id);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 border-b bg-background px-3 py-2.5">
        {hasNamedOrders && (
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Pedidos em andamento"
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const itemCount = countItems(tab);
              const label = getCartTabLabel(tab);
              return (
                <div
                  key={tab.id}
                  data-tab-id={tab.id}
                  className={cn(
                    "flex h-9 shrink-0 items-center rounded-lg border text-sm",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card",
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    title={isActive ? "Toque para mudar o nome" : undefined}
                    className="flex h-full items-center gap-1.5 pr-0.5 pl-2.5 font-medium"
                    onClick={() => handleTabClick(tab)}
                  >
                    <span className="max-w-32 truncate">{label}</span>
                    {itemCount > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-xs tabular-nums",
                          isActive
                            ? "bg-primary-foreground/20"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {itemCount}
                      </span>
                    )}
                  </button>
                  {canCloseTab(tab, tabs.length) ? (
                    <button
                      type="button"
                      aria-label={`Fechar ${label}`}
                      className="flex size-7 items-center justify-center rounded-md opacity-70 hover:opacity-100"
                      onClick={() => requestRemove(tab)}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  ) : (
                    <span className="w-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shrink-0 rounded-lg"
          aria-label="Novo pedido"
          disabled={tabs.length >= MAX_CART_TABS}
          onClick={onAdd}
        >
          <Users aria-hidden />
        </Button>
      </div>
      <ConfirmDialog
        isOpen={tabToRemove !== null}
        onOpenChange={(isOpen) => !isOpen && setTabToRemove(null)}
        title={`Descartar ${tabToRemove ? getCartTabLabel(tabToRemove) : "pedido"}?`}
        description="Os itens desse pedido serão removidos do carrinho."
        confirmLabel="Descartar"
        isConfirming={false}
        onConfirm={confirmRemove}
      />
    </>
  );
}
