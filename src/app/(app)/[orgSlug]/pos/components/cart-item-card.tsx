import { CartLineCard } from "@/components/cart-line-card";
import { formatAddonNames } from "@/features/product-addons/item-addons";
import type { CartLine } from "../hooks/use-pos-catalog";

type CartItemCardProps = {
  cartLine: CartLine;
  onDecrement: (cartLine: CartLine) => void;
  onEditNote: (cartLine: CartLine) => void;
};

export function CartItemCard({
  cartLine,
  onDecrement,
  onEditNote,
}: CartItemCardProps) {
  const { product, addons, displayName, quantity, note, total } = cartLine;

  return (
    <CartLineCard
      name={product.name}
      accessibleName={displayName}
      quantity={quantity}
      note={note}
      total={total}
      className="gap-2.5 p-2.5"
      details={
        addons.length > 0 && (
          <span className="truncate text-muted-foreground text-xs">
            {formatAddonNames(addons)}
          </span>
        )
      }
      onEditNote={() => onEditNote(cartLine)}
      onDecrement={() => onDecrement(cartLine)}
    />
  );
}
