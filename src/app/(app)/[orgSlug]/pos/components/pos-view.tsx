"use client";

import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CategoryId } from "@/features/categories/types";
import { PaymentDialog } from "@/features/orders/components/payment-dialog";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import {
  useCart,
  useCartStore,
  useHydratedCartStore,
  useTabTarget,
} from "@/features/pos/cart-store";
import type { ProductId } from "@/features/products/types";
import { ModuleLinkButton } from "../../components/module-link-button";
import { PageHeader } from "../../components/page-header";
import { type PosProduct, usePosCatalog } from "../hooks/use-pos-catalog";
import { usePosCheckout } from "../hooks/use-pos-checkout";
import { CartPanel } from "./cart-panel";
import { CategoryFilter, type CategoryFilterOption } from "./category-filter";
import { CustomerDialog } from "./customer-dialog";
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
  orderTabsHref: string;
  canOpenOrderTabs: boolean;
};

function matchesSearch(product: PosProduct, normalizedSearch: string) {
  return product.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
}

export function PosView({
  organizationId,
  organizationName,
  ticketBusiness,
  isTakeawayEnabled,
  takeawayFee,
  orderTabsHref,
  canOpenOrderTabs,
}: PosViewProps) {
  const router = useRouter();
  const isCartHydrated = useHydratedCartStore();
  const cart = useCart(organizationId);
  const storedTabTarget = useTabTarget(organizationId);
  const tabTarget = isCartHydrated ? storedTabTarget : null;
  const setTabTarget = useCartStore((state) => state.setTabTarget);
  const addProductToCart = useCartStore((state) => state.addProduct);
  const decrementProductInCart = useCartStore(
    (state) => state.decrementProduct,
  );
  const setCartNote = useCartStore((state) => state.setNote);
  const clearCart = useCartStore((state) => state.clearCart);

  const { posProducts, cartLines, categories, isLoading, errorMessage } =
    usePosCatalog(organizationId, cart);
  const checkout = usePosCheckout({
    organizationId,
    ticketBusiness,
    takeawayFee,
    cart,
    cartLines,
    tabTarget,
    onOrderPlaced: () => clearCart(organizationId),
    onItemsAddedToTab: () => {
      clearCart(organizationId);
      setTabTarget(organizationId, null);
      router.push(orderTabsHref);
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
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

  const handleDecrementProduct = useCallback(
    (productId: ProductId) => decrementProductInCart(organizationId, productId),
    [decrementProductInCart, organizationId],
  );

  return (
    <div className="flex h-svh min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={organizationName}
          description={<PosHeaderDescription />}
          actions={
            canOpenOrderTabs && (
              <ModuleLinkButton
                href={orderTabsHref}
                label="Comandas"
                icon={ClipboardList}
              />
            )
          }
        />
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-6 pb-8 md:px-8">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : (
            <ProductGrid
              products={visibleProducts}
              isLoading={isLoading || !isCartHydrated}
              onAdd={handleAddProduct}
            />
          )}
        </div>
      </div>

      <CartPanel
        cartLines={isCartHydrated ? cartLines : []}
        note={cart.note}
        isSendingToKitchen={checkout.isPlacingOrder}
        onNoteChange={(note) => setCartNote(organizationId, note)}
        onDecrement={handleDecrementProduct}
        onSendToKitchen={checkout.startKitchenCheckout}
        onQuickPayment={checkout.startQuickPayment}
        tabTarget={tabTarget}
        isAddingToTab={checkout.isAddingToTab}
        onAddToTab={checkout.addToTab}
        onExitTabMode={() => setTabTarget(organizationId, null)}
      />

      <CustomerDialog
        organizationId={organizationId}
        isOpen={checkout.checkoutStep.step === "customer"}
        takeawayFee={takeawayFee}
        isTakeawayEnabled={isTakeawayEnabled}
        onClose={checkout.cancelCheckout}
        isOpeningTab={checkout.isOpeningTab}
        onConfirm={checkout.confirmCustomer}
        onOpenTab={checkout.openTab}
      />
      <PaymentDialog
        organizationId={organizationId}
        isOpen={isKitchenPayment || isQuickPayment}
        title="Pagamento"
        submitLabel={
          isKitchenPayment ? "Pagamento recebido" : "Confirmar pagamento"
        }
        summary={checkout.paymentSummary}
        isSubmitting={checkout.isPlacingOrder}
        onClose={checkout.cancelCheckout}
        onConfirm={checkout.confirmPayment}
        secondaryAction={
          isQuickPayment
            ? {
                label: "Criar comanda",
                isPending: false,
                onClick: checkout.startTabCreation,
              }
            : undefined
        }
      />
      <TabNameDialog
        organizationId={organizationId}
        isOpen={checkout.checkoutStep.step === "tab-name"}
        isCreatingTab={checkout.isPlacingOrder}
        onClose={checkout.startQuickPayment}
        onConfirm={checkout.createTab}
      />
    </div>
  );
}
