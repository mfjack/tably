import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMonthLabel,
  shiftMonthKey,
} from "@/features/time-clock/time-utils";

type MonthNavigatorProps = {
  monthKey: string;
  onChange: (monthKey: string) => void;
};

export function MonthNavigator({ monthKey, onChange }: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border px-1 py-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <span className="min-w-36 text-center font-semibold text-sm">
        {formatMonthLabel(monthKey)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}
