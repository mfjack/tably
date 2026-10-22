import { MessageSquareText, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type CartLineCardProps = {
  name: string;
  accessibleName?: string;
  quantity: number;
  note: string;
  total: number;
  details?: ReactNode;
  className?: string;
  onEditNote: () => void;
  onDecrement: () => void;
};

export function CartLineCard({
  name,
  accessibleName = name,
  quantity,
  note,
  total,
  details,
  className,
  onEditNote,
  onDecrement,
}: CartLineCardProps) {
  const hasNote = note !== "";

  return (
    <li
      className={cn(
        "flex items-center rounded-xl border bg-card shadow-xs",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border font-bold text-xs shadow-xs tabular-nums">
        {quantity}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-sm">{name}</span>
        {details}
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
            ? `Editar observação de ${accessibleName}`
            : `Adicionar observação a ${accessibleName}`
        }
        onClick={onEditNote}
      >
        <MessageSquareText aria-hidden />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        aria-label={`Remover 1 ${accessibleName} do pedido`}
        onClick={onDecrement}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
