import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type StockEntryButtonProps = {
  ingredientName: string;
  onClick: () => void;
};

export function StockEntryButton({
  ingredientName,
  onClick,
}: StockEntryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`Registrar entrada de ${ingredientName}`}
      onClick={onClick}
    >
      <PackagePlus aria-hidden />
      Entrada
    </Button>
  );
}
