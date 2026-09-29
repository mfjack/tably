"use client";

import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import type { ProductAvailability } from "@/features/products/availability";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PosProduct } from "../hooks/use-pos-catalog";

type ProductCardProps = {
  product: PosProduct;
  onAdd: (productId: ProductId) => void;
};

function getAvailabilityLabel(
  availability: ProductAvailability,
): string | null {
  if (availability.status === "low") return `Restam ${availability.remaining}`;
  if (availability.status === "out") return "Esgotado";
  return null;
}

function getAccessibleLabel(
  product: PosProduct,
  availabilityLabel: string | null,
) {
  return [
    product.name,
    formatCurrency(product.price),
    product.cartQuantity > 0 ? `${product.cartQuantity} no pedido` : null,
    availabilityLabel,
  ]
    .filter(Boolean)
    .join(", ");
}

function ProductCardComponent({ product, onAdd }: ProductCardProps) {
  const { availability, cartQuantity } = product;
  const isOut = availability.status === "out";
  const isLow = availability.status === "low";
  const isInCart = cartQuantity > 0;
  const availabilityLabel = getAvailabilityLabel(availability);

  return (
    <button
      type="button"
      disabled={isOut}
      aria-label={getAccessibleLabel(product, availabilityLabel)}
      onClick={() => onAdd(product.id)}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-[14px] border bg-card p-2 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed",
        isInCart && !isLow && !isOut && "border-primary bg-primary/5",
        isLow && "border-destructive/25 bg-destructive/5",
        isOut && "border-dashed hover:border-border",
      )}
    >
      <div
        className={cn(
          "relative flex h-19 items-center justify-center overflow-hidden rounded-[10px] bg-foreground/5 text-muted-foreground/70",
          isLow && "bg-destructive/10",
          isOut && "text-muted-foreground/40",
        )}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="200px"
            className="object-cover"
          />
        ) : (
          <ShoppingBag className="size-7.5" strokeWidth={1.5} aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-1 pb-0.5">
        <span
          className={cn(
            "truncate font-semibold text-[15px]",
            isOut && "text-muted-foreground/80",
          )}
        >
          {product.name}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "whitespace-nowrap text-[13px] text-muted-foreground tabular-nums",
              isOut && "text-muted-foreground/60",
            )}
          >
            {formatCurrency(product.price)}
          </span>
          {availabilityLabel && (
            <span
              className={cn(
                "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-md px-2 font-semibold text-xs leading-none",
                isOut
                  ? "bg-muted-foreground text-background"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {availabilityLabel}
            </span>
          )}
        </div>
      </div>

      {isInCart && (
        <span
          aria-hidden
          className="absolute -top-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary font-bold text-[13px] text-primary-foreground tabular-nums"
        >
          {cartQuantity}
        </span>
      )}
    </button>
  );
}

export const ProductCard = memo(ProductCardComponent);
