import { MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAddonNames } from "@/features/product-addons/item-addons";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  const hasNote = note !== "";

  return (
    <li className="flex items-center gap-3.5 rounded-xl border bg-card p-3 shadow-xs">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border font-bold text-xs shadow-xs tabular-nums">
        {quantity}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-sm">{product.name}</span>
        {addons.length > 0 && (
          <span className="truncate text-muted-foreground text-xs">
            {formatAddonNames(addons)}
          </span>
        )}
        {hasNote && (
          <span className="truncate text-primary text-xs">↳ {note}</span>
        )}
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className={cn(hasNote && "border-primary text-primary")}
        aria-label={
          hasNote
            ? `Editar observação de ${displayName}`
            : `Adicionar observação a ${displayName}`
        }
        onClick={() => onEditNote(cartLine)}
      >
        <MessageSquareText aria-hidden />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        aria-label={`Remover 1 ${displayName} do pedido`}
        onClick={() => onDecrement(cartLine)}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
