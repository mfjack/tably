import { SearchX } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductId } from "@/features/products/types";
import { cn } from "@/lib/utils";
import type { PosProduct } from "../hooks/use-pos-catalog";
import type { StockLinks } from "../stock-links";
import { ProductCard } from "./product-card";

const PRODUCT_GRID_BASE_CLASS_NAME = "grid grid-cols-3 gap-3 md:gap-4";

const PRODUCT_GRID_COLUMNS_CLASS_NAMES = {
  withCart: "md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
  withoutCart: "md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9",
} as const;

export function getProductGridClassName(isCartVisible: boolean): string {
  return cn(
    PRODUCT_GRID_BASE_CLASS_NAME,
    PRODUCT_GRID_COLUMNS_CLASS_NAMES[
      isCartVisible ? "withCart" : "withoutCart"
    ],
  );
}

const LOADING_CARD_COUNT = 10;

type ProductGridProps = {
  products: readonly PosProduct[];
  isLoading: boolean;
  onAdd: (productId: ProductId) => void;
  stockLinks?: StockLinks;
  onLongPress?: (productId: ProductId) => void;
  isCartVisible: boolean;
};

export function ProductGrid({
  products,
  isLoading,
  onAdd,
  stockLinks,
  onLongPress,
  isCartVisible,
}: ProductGridProps) {
  const gridClassName = getProductGridClassName(isCartVisible);

  if (isLoading) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
          <Skeleton
            key={`loading-${index.toString()}`}
            className="h-36 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nenhum produto encontrado</EmptyTitle>
          <EmptyDescription>
            Confira a busca e a categoria, ou cadastre produtos ativos no módulo
            Produtos.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAdd}
          stockLinks={stockLinks}
          onLongPress={onLongPress}
        />
      ))}
    </div>
  );
}
