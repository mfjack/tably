import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ProductOrganizerBarProps = {
  canDrag: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function ProductOrganizerBar({
  canDrag,
  isSaving,
  onCancel,
  onSave,
}: ProductOrganizerBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        {canDrag
          ? "Arraste os produtos para a posição que quiser."
          : "Escolha uma categoria para organizar os produtos dela."}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 sm:flex-none"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-10 flex-1 sm:flex-none"
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving && <Spinner aria-hidden />}
          Pronto
        </Button>
      </div>
    </div>
  );
}
