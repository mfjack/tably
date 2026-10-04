"use client";

import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import {
  buildCategoryOrder,
  sortByCategoryOrder,
} from "@/features/categories/category-order";
import type { CategoryId } from "@/features/categories/types";
import { PaymentDialog } from "@/features/orders/components/payment-dialog";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import {
  getCartTabLabel,
  useActiveCartTab,
  useActiveCartTabId,
  useCart,
  useCartStore,
  useCartTabs,
  useHydratedCartStore,
  useTabTarget,
} from "@/features/pos/cart-store";
import type { ProductId } from "@/features/products/types";
import { useIsOnline } from "@/hooks/use-is-online";
import { ModuleLinkButton } from "../../components/module-link-button";
import { PageHeader } from "../../components/page-header";
import {
  type GroupCheckoutMode,
  useGroupCheckout,
} from "../hooks/use-group-checkout";
import {
  type CartLine,
  type PosProduct,
  usePosCatalog,
} from "../hooks/use-pos-catalog";
import { usePosCheckout } from "../hooks/use-pos-checkout";
import { CartPanel } from "./cart-panel";
import {
  CartTabNameDialog,
  type CartTabNameDialogState,
} from "./cart-tab-name-dialog";
import { CartTabsBar } from "./cart-tabs-bar";
import { CashRegisterClosedState } from "./cash-register-closed-state";
import { CashRegisterPanel } from "./cash-register-panel";
import { CategoryFilter, type CategoryFilterOption } from "./category-filter";
import { CustomerDialog } from "./customer-dialog";
import { type GroupOrderEntry, GroupOrdersDialog } from "./group-orders-dialog";
import { ItemNoteDialog } from "./item-note-dialog";
import { MobileCartSheet } from "./mobile-cart-sheet";
import { OfflineStatus } from "./offline-status";
import { OnlineOrdersPanel } from "./online-orders-panel";
import { OpenCashRegisterDialog } from "./open-cash-register-dialog";
import { PosHeaderDescription } from "./pos-header-description";
import { ProductGrid } from "./product-grid";
import { ProductSearchInput } from "./product-search-input";
import { TabNameDialog } from "./tab-name-dialog";

type PosViewProps = {
  organizationId: OrganizationId;
  organizationName: string;
  ticketBusiness: OrderTicketBusiness;
  isTakeawayEnabled: boolean;
  takeawayFee: number;
  checkoutSettings: OrganizationCheckoutSettings;
  isOnlineOrderingEnabled: boolean;
  orderTabsHref: string;
  canOpenOrderTabs: boolean;
  kitchenHref: string | null;
  isKitchenEnabled: boolean;
};

const OFFLINE_CATALOG_MESSAGE =
  "Sem internet e o cardápio ainda não foi salvo neste aparelho. Abra o PDV com internet uma vez para vender offline.";

function matchesSearch(product: PosProduct, normalizedSearch: string) {
  return product.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
}

export function PosView({
  organizationId,
  organizationName,
  ticketBusiness,
  isTakeawayEnabled,
  takeawayFee,
  checkoutSettings,
  isOnlineOrderingEnabled,
  orderTabsHref,
  canOpenOrderTabs,
  kitchenHref,
  isKitchenEnabled,
}: PosViewProps) {
  const router = useRouter();
  const isCartHydrated = useHydratedCartStore();
  const cart = useCart(organizationId);
  const storedTabTarget = useTabTarget(organizationId);
  const tabTarget = isCartHydrated ? storedTabTarget : null;
  const setTabTarget = useCartStore((state) => state.setTabTarget);
  const addProductToCart = useCartStore((state) => state.addProduct);
  const decrementCartItem = useCartStore((state) => state.decrementItem);
  const setCartItemNote = useCartStore((state) => state.setItemNote);
  const finishCartTab = useCartStore((state) => state.finishCartTab);
  const addCartTab = useCartStore((state) => state.addCartTab);
  const selectCartTab = useCartStore((state) => state.selectCartTab);
  const renameCartTab = useCartStore((state) => state.renameCartTab);
  const activeCartTab = useActiveCartTab(organizationId);
  const [groupDialogMode, setGroupDialogMode] =
    useState<GroupCheckoutMode | null>(null);
  const [tabNameDialogState, setTabNameDialogState] =
    useState<CartTabNameDialogState>({ mode: "closed" });
  const { tabs: cartTabs } = useCartTabs(organizationId);
  const activeCartTabId = useActiveCartTabId(organizationId);

  const {
    posProducts,
    cartLines,
    buildCartLines,
    categories,
    isLoading,
    errorMessage,
  } = usePosCatalog(organizationId, cart);
  const categoryOrder = useMemo(
    () => buildCategoryOrder(categories),
    [categories],
  );
  const isOnline = useIsOnline();
  const cashSessionQuery = useOpenCashSessionQuery(organizationId);
  const isCashRegisterClosed =
    isOnline && cashSessionQuery.isSuccess && cashSessionQuery.data === null;
  const [isOpenRegisterDialogOpen, setIsOpenRegisterDialogOpen] =
    useState(false);
  const catalogErrorMessage =
    errorMessage ??
    (!isOnline && isLoading ? OFFLINE_CATALOG_MESSAGE : undefined);
  const checkout = usePosCheckout({
    organizationId,
    ticketBusiness,
    takeawayFee,
    cart,
    cartLines,
    tabTarget,
    cartTabId: activeCartTabId,
    categoryOrder,
    isKitchenEnabled,
    onOrderPlaced: (cartTabId) => {
      if (cartTabId) finishCartTab(organizationId, cartTabId);
    },
    onItemsAddedToTab: (cartTabId) => {
      if (cartTabId) finishCartTab(organizationId, cartTabId);
      setTabTarget(organizationId, null);
      router.push(orderTabsHref);
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [noteCartLine, setNoteCartLine] = useState<CartLine | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<CategoryId | null>(null);

  const isKitchenPayment = checkout.checkoutStep.step === "kitchen-payment";
  const isQuickPayment = checkout.checkoutStep.step === "quick-payment";

  const categoryOptions = useMemo<CategoryFilterOption[]>(() => {
    const categoryIdsWithProducts = new Set<CategoryId>(
      posProducts.flatMap((product) =>
        product.categoryId ? [product.categoryId] : [],
      ),
    );

    return [
      { id: null, label: "Todos" },
      ...(categories ?? [])
        .filter((category) => categoryIdsWithProducts.has(category.id))
        .map((category) => ({ id: category.id, label: category.name })),
    ];
  }, [categories, posProducts]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
    return posProducts.filter(
      (product) =>
        (selectedCategoryId === null ||
          product.categoryId === selectedCategoryId) &&
        (normalizedSearch === "" || matchesSearch(product, normalizedSearch)),
    );
  }, [posProducts, searchTerm, selectedCategoryId]);

  const handleAddProduct = useCallback(
    (productId: ProductId) => addProductToCart(organizationId, productId),
    [addProductToCart, organizationId],
  );

  const handleDecrementItem = useCallback(
    (cartLine: CartLine) =>
      decrementCartItem(organizationId, cartLine.product.id, cartLine.note),
    [decrementCartItem, organizationId],
  );

  function saveItemNote(
    cartLine: CartLine,
    note: string,
    quantityToMove: number,
  ) {
    setCartItemNote(
      organizationId,
      cartLine.product.id,
      cartLine.note,
      note,
      quantityToMove,
    );
  }

  function submitTabName(name: string) {
    if (tabNameDialogState.mode === "create") {
      addCartTab(organizationId, name);
      return;
    }
    if (activeCartTabId) renameCartTab(organizationId, activeCartTabId, name);
  }

  const hasItemsInAnyTab = cartTabs.some((tab) => tab.items.length > 0);
  const tabsWithItems = cartTabs.filter((tab) => tab.items.length > 0);
  const hasManyOrders = tabsWithItems.length > 1;
  const groupOrderEntries: GroupOrderEntry[] = tabsWithItems.map((tab) => {
    const tabLines = buildCartLines(tab.items);
    return {
      cartTabId: tab.id,
      label: getCartTabLabel(tab),
      defaultName: tab.name,
      itemCount: tabLines.reduce((count, line) => count + line.quantity, 0),
      total: tabLines.reduce((total, line) => total + line.total, 0),
    };
  });

  const groupCheckout = useGroupCheckout({
    placeGroupOrder: checkout.placeGroupOrder,
    printGroupedOrders: checkout.printGroupedOrders,
    isKitchenEnabled,
    onTabFinished: (cartTabId) => finishCartTab(organizationId, cartTabId),
  });

  function startQuickPayment() {
    if (hasManyOrders) {
      setGroupDialogMode("payment");
      return;
    }
    checkout.startQuickPayment();
  }

  function startSendToKitchen() {
    if (hasManyOrders) {
      setGroupDialogMode("kitchen");
      return;
    }
    checkout.startKitchenCheckout();
  }

  function confirmGroupOrders(names: readonly string[]) {
    const groups = groupOrderEntries.map((entry, index) => {
      const tab = tabsWithItems.find(({ id }) => id === entry.cartTabId);
      return {
        cartTabId: entry.cartTabId,
        customerName: names[index] ?? entry.label,
        cartLines: sortByCategoryOrder(
          buildCartLines(tab?.items ?? []),
          (cartLine) => cartLine.product.categoryId,
          categoryOrder,
        ),
      };
    });
    if (groupDialogMode) groupCheckout.start(groups, groupDialogMode);
    setGroupDialogMode(null);
  }
  const cartTabsBar = isCartHydrated ? (
    <CartTabsBar
      tabs={cartTabs}
      activeTabId={activeCartTabId}
      onSelect={(tabId) => selectCartTab(organizationId, tabId)}
      onRename={(tab) =>
        setTabNameDialogState({ mode: "rename", currentName: tab.name })
      }
      onAdd={() => setTabNameDialogState({ mode: "create" })}
      onRemove={(tabId) => finishCartTab(organizationId, tabId)}
    />
  ) : null;

  return (
    <div className="flex h-svh min-h-0 flex-col md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={organizationName}
          description={<PosHeaderDescription />}
          actions={
            <>
              <OfflineStatus organizationId={organizationId} />
              <CashRegisterPanel
                organizationId={organizationId}
                ticketBusiness={ticketBusiness}
                onOpenRegister={() => setIsOpenRegisterDialogOpen(true)}
              />
              {isOnlineOrderingEnabled && (
                <OnlineOrdersPanel
                  organizationId={organizationId}
                  ticketBusiness={ticketBusiness}
                  kitchenHref={kitchenHref}
                  isKitchenEnabled={isKitchenEnabled}
                />
              )}
              {canOpenOrderTabs && (
                <ModuleLinkButton
                  href={orderTabsHref}
                  label="Comandas"
                  icon={ClipboardList}
                />
              )}
            </>
          }
        />
        {isCashRegisterClosed ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-8">
            <CashRegisterClosedState
              onOpenRegister={() => setIsOpenRegisterDialogOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 px-4 pt-5 md:px-8">
              <CategoryFilter
                options={categoryOptions}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
              />
              <ProductSearchInput
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-6 pb-28 md:px-8 md:pb-8">
              {catalogErrorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{catalogErrorMessage}</AlertDescription>
                </Alert>
              ) : (
                <ProductGrid
                  products={visibleProducts}
                  isLoading={isLoading || !isCartHydrated}
                  onAdd={handleAddProduct}
                />
              )}
            </div>
          </>
        )}
      </div>

      <CartPanel
        header={cartTabsBar}
        variant="sidebar"
        cartLines={isCartHydrated ? cartLines : []}
        isSendingToKitchen={checkout.isPlacingOrder || groupCheckout.isPlacing}
        sendToKitchenLabel={
          hasManyOrders ? `Imprimir todos (${tabsWithItems.length})` : undefined
        }
        onDecrement={handleDecrementItem}
        onEditItemNote={setNoteCartLine}
        onSendToKitchen={startSendToKitchen}
        onQuickPayment={startQuickPayment}
        quickPaymentLabel={
          hasManyOrders ? `Pagamento (${tabsWithItems.length})` : undefined
        }
        tabTarget={tabTarget}
        isAddingToTab={checkout.isAddingToTab}
        onAddToTab={checkout.addToTab}
        onExitTabMode={() => setTabTarget(organizationId, null)}
      />
      <MobileCartSheet
        header={cartTabsBar}
        hasOpenOrders={hasItemsInAnyTab}
        cartLines={isCartHydrated ? cartLines : []}
        isSendingToKitchen={checkout.isPlacingOrder || groupCheckout.isPlacing}
        sendToKitchenLabel={
          hasManyOrders ? `Imprimir todos (${tabsWithItems.length})` : undefined
        }
        onDecrement={handleDecrementItem}
        onEditItemNote={setNoteCartLine}
        onSendToKitchen={startSendToKitchen}
        onQuickPayment={startQuickPayment}
        quickPaymentLabel={
          hasManyOrders ? `Pagamento (${tabsWithItems.length})` : undefined
        }
        tabTarget={tabTarget}
        isAddingToTab={checkout.isAddingToTab}
        onAddToTab={checkout.addToTab}
        onExitTabMode={() => setTabTarget(organizationId, null)}
      />

      <OpenCashRegisterDialog
        organizationId={organizationId}
        isOpen={isOpenRegisterDialogOpen}
        onClose={() => setIsOpenRegisterDialogOpen(false)}
      />
      <CustomerDialog
        organizationId={organizationId}
        isOpen={checkout.checkoutStep.step === "customer"}
        takeawayFee={takeawayFee}
        isTakeawayEnabled={isTakeawayEnabled}
        defaultCustomerName={activeCartTab?.name}
        onClose={checkout.cancelCheckout}
        onConfirm={checkout.confirmCustomer}
      />
      <PaymentDialog
        organizationId={organizationId}
        isOpen={isKitchenPayment || isQuickPayment}
        title="Pagamento"
        submitLabel={
          isKitchenPayment ? "Pagamento recebido" : "Confirmar pagamento"
        }
        summary={checkout.paymentSummary}
        checkoutSettings={checkoutSettings}
        isServiceFeeSuggested={false}
        isSubmitting={checkout.isPlacingOrder && !checkout.isOpeningTab}
        onClose={checkout.cancelCheckout}
        onConfirm={checkout.confirmPayment}
        secondaryAction={
          isQuickPayment
            ? {
                label: "Criar comanda",
                isPending: false,
                onClick: checkout.startTabCreation,
              }
            : {
                label: "Abrir comanda",
                isPending: checkout.isOpeningTab,
                onClick: checkout.openKitchenTab,
              }
        }
      />
      <ItemNoteDialog
        cartLine={noteCartLine}
        onClose={() => setNoteCartLine(null)}
        onSave={saveItemNote}
      />
      <GroupOrdersDialog
        organizationId={organizationId}
        entries={groupOrderEntries}
        mode={groupDialogMode ?? "kitchen"}
        isOpen={groupDialogMode !== null && groupOrderEntries.length > 0}
        isSubmitting={false}
        onClose={() => setGroupDialogMode(null)}
        onConfirm={confirmGroupOrders}
      />
      {groupCheckout.currentGroup && groupCheckout.summary && (
        <PaymentDialog
          key={groupCheckout.currentGroup.cartTabId}
          organizationId={organizationId}
          isOpen
          title={`Pagamento · ${groupCheckout.currentGroup.customerName} (${groupCheckout.position}/${groupCheckout.groupCount})`}
          submitLabel={
            groupCheckout.mode === "kitchen"
              ? "Pagamento recebido"
              : "Confirmar pagamento"
          }
          summary={groupCheckout.summary}
          checkoutSettings={checkoutSettings}
          isServiceFeeSuggested={false}
          isSubmitting={groupCheckout.isPlacing}
          onClose={groupCheckout.cancel}
          onConfirm={(payments, adjustments, total) =>
            void groupCheckout.submit({ payments, adjustments, total })
          }
          secondaryAction={{
            label:
              groupCheckout.mode === "kitchen"
                ? "Abrir comanda"
                : "Criar comanda",
            isPending: false,
            onClick: () => void groupCheckout.submit(undefined),
          }}
        />
      )}
      <CartTabNameDialog
        state={tabNameDialogState}
        organizationId={organizationId}
        otherTabNames={cartTabs
          .filter(
            (tab) =>
              tabNameDialogState.mode !== "rename" ||
              tab.id !== activeCartTabId,
          )
          .map((tab) => tab.name)
          .filter(Boolean)}
        onClose={() => setTabNameDialogState({ mode: "closed" })}
        onSubmit={submitTabName}
      />
      <TabNameDialog
        organizationId={organizationId}
        isOpen={checkout.checkoutStep.step === "tab-name"}
        isCreatingTab={checkout.isPlacingOrder}
        defaultCustomerName={activeCartTab?.name}
        onClose={checkout.startQuickPayment}
        onConfirm={checkout.createTab}
      />
    </div>
  );
}
