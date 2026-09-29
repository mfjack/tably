"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CategoryId } from "@/features/categories/types";
import { usePlaceOrderMutation } from "@/features/orders/hooks/use-place-order-mutation";
import type { OrderPaymentInput } from "@/features/orders/schemas";
import type { PlacedOrder } from "@/features/orders/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  useCart,
  useCartStore,
  useHydratedCartStore,
} from "@/features/pos/cart-store";
import { printKitchenTicket } from "@/features/pos/print-kitchen-ticket";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "../../components/page-header";
import { type PosProduct, usePosCatalog } from "../hooks/use-pos-catalog";
import { CartPanel } from "./cart-panel";
import { CategoryFilter, type CategoryFilterOption } from "./category-filter";
import { PosHeaderDescription } from "./pos-header-description";
import { ProductGrid } from "./product-grid";
import { ProductSearchInput } from "./product-search-input";
import { QuickPaymentDialog } from "./quick-payment-dialog";

type PosViewProps = {
  organizationId: OrganizationId;
  organizationName: string;
};

function matchesSearch(product: PosProduct, normalizedSearch: string) {
  return product.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
}

function getChangeMessage(
  payment: OrderPaymentInput,
  placedOrder: PlacedOrder,
) {
  if (payment.method !== "cash" || payment.amountReceived === undefined) {
    return undefined;
  }
  const change = payment.amountReceived - placedOrder.total;
  return change > 0 ? `Troco: ${formatCurrency(change)}` : undefined;
}

export function PosView({ organizationId, organizationName }: PosViewProps) {
  const isCartHydrated = useHydratedCartStore();
  const cart = useCart(organizationId);
  const addProductToCart = useCartStore((state) => state.addProduct);
  const decrementProductInCart = useCartStore(
    (state) => state.decrementProduct,
  );
  const setCartNote = useCartStore((state) => state.setNote);
  const clearCart = useCartStore((state) => state.clearCart);

  const { posProducts, cartLines, categories, isLoading, errorMessage } =
    usePosCatalog(organizationId, cart);
  const placeOrderMutation = usePlaceOrderMutation(organizationId);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<CategoryId | null>(null);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);

  const categoryOptions = useMemo<CategoryFilterOption[]>(() => {
    const productCountByCategory = new Map<CategoryId, number>();
    for (const product of posProducts) {
      if (!product.categoryId) continue;
      productCountByCategory.set(
        product.categoryId,
        (productCountByCategory.get(product.categoryId) ?? 0) + 1,
      );
    }

    return [
      { id: null, label: "Todos", productCount: posProducts.length },
      ...(categories ?? [])
        .filter((category) => productCountByCategory.has(category.id))
        .map((category) => ({
          id: category.id,
          label: category.name,
          productCount: productCountByCategory.get(category.id) ?? 0,
        })),
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

  const orderTotal = cartLines.reduce(
    (total, cartLine) => total + cartLine.total,
    0,
  );

  const handleAddProduct = useCallback(
    (productId: ProductId) => addProductToCart(organizationId, productId),
    [addProductToCart, organizationId],
  );

  const handleDecrementProduct = useCallback(
    (productId: ProductId) => decrementProductInCart(organizationId, productId),
    [decrementProductInCart, organizationId],
  );

  function buildOrderItems() {
    return cartLines.map((cartLine) => ({
      productId: cartLine.product.id,
      quantity: cartLine.quantity,
    }));
  }

  function handleSendToKitchen() {
    const ticketItems = cartLines.map((cartLine) => ({
      name: cartLine.product.name,
      quantity: cartLine.quantity,
    }));
    const ticketNote = cart.note.trim() || undefined;

    placeOrderMutation.mutate(
      { items: buildOrderItems(), note: cart.note },
      {
        onSuccess: (placedOrder) => {
          clearCart(organizationId);
          toast.success(
            `Pedido #${placedOrder.number} enviado para a cozinha.`,
          );
          printKitchenTicket({
            organizationName,
            orderNumber: placedOrder.number,
            items: ticketItems,
            note: ticketNote,
            createdAt: new Date(),
          });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function handleQuickPayment(payment: OrderPaymentInput) {
    placeOrderMutation.mutate(
      { items: buildOrderItems(), note: cart.note, payment },
      {
        onSuccess: (placedOrder) => {
          clearCart(organizationId);
          setIsQuickPaymentOpen(false);
          toast.success(`Pedido #${placedOrder.number} pago.`, {
            description: getChangeMessage(payment, placedOrder),
          });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex h-svh min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={organizationName}
          description={<PosHeaderDescription />}
          actions={
            <ProductSearchInput
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
            />
          }
        />
        <div className="px-4 pt-5 md:px-8">
          <CategoryFilter
            options={categoryOptions}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
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
        isSendingToKitchen={placeOrderMutation.isPending}
        onNoteChange={(note) => setCartNote(organizationId, note)}
        onDecrement={handleDecrementProduct}
        onSendToKitchen={handleSendToKitchen}
        onQuickPayment={() => setIsQuickPaymentOpen(true)}
      />

      <QuickPaymentDialog
        isOpen={isQuickPaymentOpen}
        orderTotal={orderTotal}
        isSubmitting={placeOrderMutation.isPending}
        onClose={() => setIsQuickPaymentOpen(false)}
        onConfirm={handleQuickPayment}
      />
    </div>
  );
}
