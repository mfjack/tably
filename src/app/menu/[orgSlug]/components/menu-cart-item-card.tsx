import { MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemAddonNames } from "@/features/product-addons/components/item-addon-names";
import type { ProductId } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const hasNote = note !== "";

  return (
    <li className="flex items-center gap-3.5 rounded-xl border bg-card p-3 shadow-xs">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border font-bold text-xs shadow-xs tabular-nums">
        {quantity}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-sm">{name}</span>
        <ItemAddonNames addonNames={addonNames} />
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
            ? `Editar observação de ${name}`
            : `Adicionar observação a ${name}`
        }
        onClick={() => onEditNote(cartLine)}
      >
        <MessageSquareText aria-hidden />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        aria-label={`Remover 1 ${name} do pedido`}
        onClick={() => onDecrement(cartLine)}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
