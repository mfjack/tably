import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ToggleChipProps = {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
};

export function ToggleChip({ label, isSelected, onToggle }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "bg-background text-muted-foreground hover:bg-muted",
      )}
      onClick={onToggle}
    >
      {isSelected && <Check aria-hidden className="size-3.5" />}
      {label}
    </button>
  );
}
