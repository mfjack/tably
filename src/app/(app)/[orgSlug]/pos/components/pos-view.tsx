"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ItemNoteDialog } from "@/components/item-note-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOpenCashSessionQuery } from "@/features/cash-register/hooks/use-open-cash-session-query";
import { buildCategoryOrder } from "@/features/categories/category-order";
import type { OrderSummaryData } from "@/features/orders/components/order-summary";
import { PaymentDialog } from "@/features/orders/components/payment-dialog";
import { useOpenTabs } from "@/features/orders/hooks/use-open-tabs";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import { preloadThermalOrderTicket } from "@/features/orders/print-order-ticket";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";
import {
  useActiveCartTab,
  useActiveCartTabId,
  useCart,
  useCartStore,
  useCartTabs,
  useHydratedCartStore,
  useTabTarget,
} from "@/features/pos/cart-store";
import { AddonPickerDialog } from "@/features/product-addons/components/addon-picker-dialog";
import type { Product, ProductId } from "@/features/products/types";
import { useIsOnline } from "@/hooks/use-is-online";
import { PageHeader } from "../../components/page-header";
import { buildGroupOrderEntries, buildTabOrderGroups } from "../group-orders";
import {
  type GroupCheckoutMode,
  getGroupKey,
  useGroupCheckout,
} from "../hooks/use-group-checkout";
import { type CartLine, usePosCatalog } from "../hooks/use-pos-catalog";
import { usePosCheckout } from "../hooks/use-pos-checkout";
import { usePosProductFilter } from "../hooks/use-pos-product-filter";
import { useProductOrganizer } from "../hooks/use-product-organizer";
import type { StockLinks } from "../stock-links";
import { CartPanel } from "./cart-panel";
import {
  CartTabNameDialog,
  type CartTabNameDialogState,
} from "./cart-tab-name-dialog";
import { CartTabsBar } from "./cart-tabs-bar";
import { CashRegisterClosedState } from "./cash-register-closed-state";
import { CategoryFilter } from "./category-filter";
import { CustomerDialog } from "./customer-dialog";
import { GroupOrderPicker } from "./group-order-picker";
import {
  type GroupOrderConfirmation,
  GroupOrdersDialog,
} from "./group-orders-dialog";
import { MobileCartSheet } from "./mobile-cart-sheet";
import { OpenCashRegisterDialog } from "./open-cash-register-dialog";
import { PosHeaderActions } from "./pos-header-actions";
import { PosHeaderDescription } from "./pos-header-description";
import { PosOrderTabsSheet } from "./pos-order-tabs-sheet";
import { ProductGrid } from "./product-grid";
import { ProductOrganizerBar } from "./product-organizer-bar";
import { ProductSearchInput } from "./product-search-input";
import { SortableProductGrid } from "./sortable-product-grid";
import { TabNameDialog } from "./tab-name-dialog";

type PosViewProps = {
  organizationId: OrganizationId;
  organizationName: string;
  ticketBusiness: OrderTicketBusiness;
  isTakeawayEnabled: boolean;
  takeawayFee: number;
  checkoutSettings: OrganizationCheckoutSettings;
  isOnlineOrderingEnabled: boolean;
  canOpenOrderTabs: boolean;
  kitchenHref: string | null;
  printerSettingsHref: string;
  isKitchenEnabled: boolean;
  stockLinks: StockLinks;
  canOrganizeProducts: boolean;
};

const EMPTY_GROUP_SUMMARY: OrderSummaryData = {
  lines: [],
  takeawayFee: 0,
  total: 0,
};

const OFFLINE_CATALOG_MESSAGE =
  "Sem internet e o cardápio ainda não foi salvo neste aparelho. Abra o PDV com internet uma vez para vender offline.";

export function PosView({
  organizationId,
  organizationName,
  ticketBusiness,
  isTakeawayEnabled,
  takeawayFee,
  checkoutSettings,
  isOnlineOrderingEnabled,
  canOpenOrderTabs,
  kitchenHref,
  printerSettingsHref,
  isKitchenEnabled,
  stockLinks,
  canOrganizeProducts,
}: PosViewProps) {
  const isCartHydrated = useHydratedCartStore();
  const cart = useCart(organizationId);
  const storedTabTarget = useTabTarget(organizationId);
  const tabTarget = isCartHydrated ? storedTabTarget : null;
  const setTabTarget = useCartStore((state) => state.setTabTarget);
  const [isOrderTabsSheetOpen, setIsOrderTabsSheetOpen] = useState(false);
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

  useEffect(() => {
    preloadThermalOrderTicket();
  }, []);
  const activeCartTabId = useActiveCartTabId(organizationId);

  const {
    posProducts,
    cartLines,
    buildCartLines,
    getAddonOptions,
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
      setIsOrderTabsSheetOpen(true);
    },
  });

  const [noteCartLine, setNoteCartLine] = useState<CartLine | null>(null);
  const [addonPickerProduct, setAddonPickerProduct] = useState<Product | null>(
    null,
  );

  const isKitchenPayment = checkout.checkoutStep.step === "kitchen-payment";
  const isQuickPayment = checkout.checkoutStep.step === "quick-payment";

  const productOrganizer = useProductOrganizer(organizationId, posProducts);
  const { isOrganizing, organizedProducts } = productOrganizer;
  const productFilter = usePosProductFilter({
    products: posProducts,
    organizedProducts,
    categories,
    categoryOrder,
    isOrganizing,
    onStartOrganizing: productOrganizer.startOrganizing,
  });

  const handleAddProduct = useCallback(
    (productId: ProductId) => {
      const product = posProducts.find(({ id }) => id === productId);
      if (product && product.expiredIngredientNames.length > 0) {
        toast.error(`${product.name} usa item vencido do estoque.`, {
          description: product.expiredIngredientNames.join(", "),
        });
        return;
      }
      if (
        checkoutSettings.isProductAddonsEnabled &&
        product?.addons.some((addon) => addon.isActive)
      ) {
        setAddonPickerProduct(product);
        return;
      }
      addProductToCart(organizationId, productId);
    },
    [
      addProductToCart,
      checkoutSettings.isProductAddonsEnabled,
      organizationId,
      posProducts,
    ],
  );

  const handleDecrementItem = useCallback(
    (cartLine: CartLine) =>
      decrementCartItem(
        organizationId,
        cartLine.product.id,
        cartLine.note,
        cartLine.cartAddonIds,
      ),
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
      cartLine.cartAddonIds,
    );
  }

  function submitTabName(name: string) {
    if (activeCartTabId) renameCartTab(organizationId, activeCartTabId, name);
    if (tabNameDialogState.mode === "nameBeforeNext") {
      addCartTab(organizationId, "");
    }
  }

  function startNextPersonOrder() {
    if (
      activeCartTab &&
      activeCartTab.items.length > 0 &&
      !activeCartTab.name
    ) {
      setTabNameDialogState({ mode: "nameBeforeNext" });
      return;
    }
    addCartTab(organizationId, "");
  }

  const hasItemsInAnyTab = cartTabs.some((tab) => tab.items.length > 0);
  const tabsWithItems = cartTabs.filter((tab) => tab.items.length > 0);
  const hasManyOrders = tabsWithItems.length > 1;
  const groupOrderEntries = buildGroupOrderEntries(
    tabsWithItems,
    buildCartLines,
  );

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

  function confirmGroupOrders(
    orders: readonly GroupOrderConfirmation[],
    isAllTakeaway: boolean,
  ) {
    const groups = buildTabOrderGroups({
      entries: groupOrderEntries,
      tabs: tabsWithItems,
      orders,
      isAllTakeaway,
      takeawayFee,
      categoryOrder,
      buildCartLines,
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
      onAdd={
        checkoutSettings.isMultipleCartsEnabled &&
        (activeCartTab?.items.length ?? 0) > 0
          ? startNextPersonOrder
          : undefined
      }
      onRemove={(tabId) => finishCartTab(organizationId, tabId)}
    />
  ) : null;

  const canUseOrderTabs =
    canOpenOrderTabs && checkoutSettings.isOrderTabsEnabled;
  const openTabsCount =
    useOpenTabs(organizationId, canUseOrderTabs).openTabs?.length ?? 0;
  const cartPanelProps = {
    header: cartTabsBar,
    cartLines: isCartHydrated ? cartLines : [],
    isSendingToKitchen: checkout.isPlacingOrder || groupCheckout.isPlacing,
    sendToKitchenLabel: hasManyOrders
      ? `Imprimir todos (${tabsWithItems.length})`
      : undefined,
    onDecrement: handleDecrementItem,
    onEditItemNote: setNoteCartLine,
    onSendToKitchen: startSendToKitchen,
    onQuickPayment: startQuickPayment,
    quickPaymentLabel: hasManyOrders
      ? `Pagamento (${tabsWithItems.length})`
      : undefined,
    tabTarget,
    isAddingToTab: checkout.isAddingToTab,
    onAddToTab: checkout.addToTab,
    onExitTabMode: () => setTabTarget(organizationId, null),
  };

  return (
    <div className="flex h-svh min-h-0 flex-col md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={organizationName}
          description={<PosHeaderDescription />}
          actions={
            <PosHeaderActions
              organizationId={organizationId}
              ticketBusiness={ticketBusiness}
              printerSettingsHref={printerSettingsHref}
              isOnlineOrderingEnabled={isOnlineOrderingEnabled}
              kitchenHref={kitchenHref}
              isKitchenEnabled={isKitchenEnabled}
              openTabsCount={openTabsCount}
              canShowOrderTabs={canUseOrderTabs}
              onOpenRegister={() => setIsOpenRegisterDialogOpen(true)}
              onOpenOrderTabs={() => setIsOrderTabsSheetOpen(true)}
            />
          }
        />
        {isCashRegisterClosed ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-6">
            <CashRegisterClosedState
              onOpenRegister={() => setIsOpenRegisterDialogOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 px-4 pt-5 md:px-6">
              <CategoryFilter
                options={productFilter.categoryOptions}
                selectedCategoryId={productFilter.selectedCategoryId}
                onSelect={productFilter.selectCategory}
              />
              {isOrganizing ? (
                <ProductOrganizerBar
                  canDrag={productFilter.canDragProducts}
                  isSaving={productOrganizer.isSaving}
                  onCancel={productOrganizer.cancelOrganizing}
                  onSave={productOrganizer.saveOrganization}
                />
              ) : (
                <ProductSearchInput
                  searchTerm={productFilter.searchTerm}
                  onSearchTermChange={productFilter.setSearchTerm}
                />
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-6 pb-28 md:px-6 md:pb-8">
              {catalogErrorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{catalogErrorMessage}</AlertDescription>
                </Alert>
              ) : isOrganizing && productFilter.canDragProducts ? (
                <SortableProductGrid
                  products={productFilter.visibleProducts}
                  onMove={productOrganizer.moveProduct}
                />
              ) : (
                <ProductGrid
                  products={productFilter.visibleProducts}
                  isLoading={isLoading || !isCartHydrated}
                  onAdd={handleAddProduct}
                  stockLinks={stockLinks}
                  onLongPress={
                    canOrganizeProducts
                      ? productFilter.startOrganizingFromProduct
                      : undefined
                  }
                />
              )}
            </div>
          </>
        )}
      </div>

      <CartPanel variant="sidebar" {...cartPanelProps} />
      <MobileCartSheet hasOpenOrders={hasItemsInAnyTab} {...cartPanelProps} />

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
          !checkoutSettings.isOrderTabsEnabled
            ? undefined
            : isQuickPayment
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
      {addonPickerProduct && (
        <AddonPickerDialog
          key={addonPickerProduct.id}
          title={addonPickerProduct.name}
          basePrice={addonPickerProduct.price}
          addons={getAddonOptions(addonPickerProduct)}
          onClose={() => setAddonPickerProduct(null)}
          onConfirm={(addonIds) => {
            addProductToCart(organizationId, addonPickerProduct.id, addonIds);
            setAddonPickerProduct(null);
          }}
        />
      )}
      <ItemNoteDialog
        line={noteCartLine}
        itemName={noteCartLine?.displayName ?? ""}
        description="Aparece no ticket e na tela da cozinha."
        placeholder="Ex.: sem açúcar, leite de aveia"
        onClose={() => setNoteCartLine(null)}
        onSave={saveItemNote}
      />
      <GroupOrdersDialog
        organizationId={organizationId}
        entries={groupOrderEntries}
        mode={groupDialogMode ?? "kitchen"}
        isOpen={groupDialogMode !== null && groupOrderEntries.length > 0}
        isSubmitting={false}
        isTakeawayEnabled={isTakeawayEnabled}
        takeawayFee={takeawayFee}
        onClose={() => setGroupDialogMode(null)}
        onConfirm={confirmGroupOrders}
      />
      {groupCheckout.isOpen && (
        <PaymentDialog
          key={groupCheckout.pendingGroups.map(getGroupKey).join(",")}
          organizationId={organizationId}
          isOpen
          title="Receber pagamento"
          orderPicker={
            <GroupOrderPicker
              groups={groupCheckout.pendingGroups}
              selectedKeys={groupCheckout.selectedKeys}
              onToggle={groupCheckout.toggle}
            />
          }
          submitLabel={
            groupCheckout.mode === "kitchen"
              ? "Pagamento recebido"
              : "Confirmar pagamento"
          }
          summary={groupCheckout.summary ?? EMPTY_GROUP_SUMMARY}
          checkoutSettings={checkoutSettings}
          isServiceFeeSuggested={false}
          isSubmitting={groupCheckout.isPlacing}
          onClose={groupCheckout.cancel}
          onConfirm={(payments, adjustments, total) =>
            void groupCheckout.submit({ payments, adjustments, total })
          }
          secondaryAction={
            checkoutSettings.isOrderTabsEnabled
              ? {
                  label:
                    groupCheckout.mode === "kitchen"
                      ? "Abrir comanda"
                      : "Criar comanda",
                  isPending: false,
                  onClick: () => void groupCheckout.submit(undefined),
                }
              : undefined
          }
        />
      )}
      <CartTabNameDialog
        state={tabNameDialogState}
        organizationId={organizationId}
        otherTabNames={cartTabs
          .filter(
            (tab) =>
              (tabNameDialogState.mode !== "rename" &&
                tabNameDialogState.mode !== "nameBeforeNext") ||
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
      {canUseOrderTabs && (
        <PosOrderTabsSheet
          organizationId={organizationId}
          ticketBusiness={ticketBusiness}
          checkoutSettings={checkoutSettings}
          isOpen={isOrderTabsSheetOpen}
          onOpenChange={setIsOrderTabsSheetOpen}
          onAddProducts={(tabTarget) => {
            setTabTarget(organizationId, tabTarget);
            setIsOrderTabsSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
