import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type StockEntryButtonProps = {
  itemName: string;
  onClick: () => void;
};

export function StockEntryButton({ itemName, onClick }: StockEntryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`Registrar entrada de ${itemName}`}
      onClick={onClick}
    >
      <PackagePlus aria-hidden />
      Entrada
    </Button>
  );
}
