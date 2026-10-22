import { CartLineCard } from "@/components/cart-line-card";
import { ItemAddonNames } from "@/features/product-addons/components/item-addon-names";
import type { ProductId } from "@/features/products/types";

export type MenuCartLine = {
  productId: ProductId;
  name: string;
  quantity: number;
  note: string;
  addonIds: string[];
  addonNames: string[];
  total: number;
};

type MenuCartItemCardProps = {
  cartLine: MenuCartLine;
  onDecrement: (cartLine: MenuCartLine) => void;
  onEditNote: (cartLine: MenuCartLine) => void;
};

export function MenuCartItemCard({
  cartLine,
  onDecrement,
  onEditNote,
}: MenuCartItemCardProps) {
  const { name, quantity, note, addonNames, total } = cartLine;

  return (
    <CartLineCard
      name={name}
      quantity={quantity}
      note={note}
      total={total}
      className="gap-3.5 p-3"
      details={<ItemAddonNames addonNames={addonNames} />}
      onEditNote={() => onEditNote(cartLine)}
      onDecrement={() => onDecrement(cartLine)}
    />
  );
}
