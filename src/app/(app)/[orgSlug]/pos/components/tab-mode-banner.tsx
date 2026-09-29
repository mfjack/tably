import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabModeBannerProps = {
  customerName: string;
  isDisabled: boolean;
  onExit: () => void;
};

export function TabModeBanner({
  customerName,
  isDisabled,
  onExit,
}: TabModeBannerProps) {
  return (
    <div className="flex items-center gap-3 border-b bg-primary/10 px-4 py-3 lg:px-6">
      <ClipboardList aria-hidden className="size-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block text-muted-foreground">
          Adicionando à comanda de
        </span>
        <strong className="block truncate font-semibold">{customerName}</strong>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Sair do modo comanda"
        disabled={isDisabled}
        onClick={onExit}
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
