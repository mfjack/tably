import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import type { IngredientId } from "@/features/ingredients/types";
import type { ProductAvailability } from "@/features/products/availability";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PosProduct } from "../hooks/use-pos-catalog";
import { AvailabilityBadge } from "./availability-badge";

type ProductCardProps = {
  product: PosProduct;
  onAdd: (productId: ProductId) => void;
  onAddStock?: (ingredientId: IngredientId) => void;
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

function ProductCardComponent({
  product,
  onAdd,
  onAddStock,
}: ProductCardProps) {
  const { availability, cartQuantity } = product;
  const isOut = availability.status === "out";
  const isLow = availability.status === "low";
  const isInCart = cartQuantity > 0;
  const availabilityLabel = getAvailabilityLabel(availability);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border bg-card p-2 text-left transition-colors hover:border-primary/40 has-[button:disabled]:cursor-not-allowed",
        isInCart && !isLow && !isOut && "border-primary bg-primary/5",
        isLow && "border-destructive/25 bg-destructive/5",
        isOut && "border-dashed hover:border-border",
      )}
    >
      <button
        type="button"
        disabled={isOut}
        aria-label={getAccessibleLabel(product, availabilityLabel)}
        onClick={() => onAdd(product.id)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed"
      />
      <div
        className={cn(
          "pointer-events-none relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-foreground/5 text-muted-foreground/70",
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
          <ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden />
        )}
      </div>

      <div className="pointer-events-none flex flex-col gap-0.5 px-1 pb-0.5">
        <span
          className={cn(
            "truncate font-semibold text-sm",
            isOut && "text-muted-foreground/80",
          )}
        >
          {product.name}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "whitespace-nowrap text-muted-foreground text-sm tabular-nums",
              isOut && "text-muted-foreground/60",
            )}
          >
            {formatCurrency(product.price)}
          </span>
          {availabilityLabel && (
            <AvailabilityBadge
              productName={product.name}
              label={availabilityLabel}
              availability={availability}
              onAddStock={onAddStock}
            />
          )}
        </div>
      </div>

      {isInCart && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary font-bold text-primary-foreground text-xs tabular-nums"
        >
          {cartQuantity}
        </span>
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);
