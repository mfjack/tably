import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddonQuantityChipProps = {
  label: string;
  addonName: string;
  quantity: number;
  maxQuantity: number;
  isDisabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function AddonQuantityChip({
  label,
  addonName,
  quantity,
  maxQuantity,
  isDisabled = false,
  onIncrement,
  onDecrement,
}: AddonQuantityChipProps) {
  if (quantity === 0) {
    return (
      <button
        type="button"
        disabled={isDisabled}
        className="inline-flex h-9 w-full items-center justify-center rounded-full border bg-background px-3.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
        onClick={onIncrement}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="inline-flex h-9 w-full items-center justify-between gap-1 rounded-full border border-primary bg-primary/10 px-1 font-medium text-primary text-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-primary hover:bg-primary/15 hover:text-primary"
        aria-label={`Tirar um ${addonName}`}
        onClick={onDecrement}
      >
        <Minus aria-hidden />
      </Button>
      <span className="min-w-0 truncate">
        {quantity}x {label}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-primary hover:bg-primary/15 hover:text-primary"
        aria-label={`Adicionar mais um ${addonName}`}
        disabled={quantity >= maxQuantity}
        onClick={onIncrement}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
