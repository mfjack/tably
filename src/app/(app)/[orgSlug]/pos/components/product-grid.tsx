"use client";

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
import type { PosProduct } from "../hooks/use-pos-catalog";
import { ProductCard } from "./product-card";

const GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-5";

const LOADING_CARD_COUNT = 10;

type ProductGridProps = {
  products: readonly PosProduct[];
  isLoading: boolean;
  onAdd: (productId: ProductId) => void;
};

export function ProductGrid({ products, isLoading, onAdd }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className={GRID_CLASS_NAME}>
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
    <div className={GRID_CLASS_NAME}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}
