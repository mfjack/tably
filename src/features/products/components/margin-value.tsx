import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type MarginValueProps = {
  margin: number | null;
  className?: string;
};

export function MarginValue({ margin, className }: MarginValueProps) {
  if (margin === null) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <span
      className={cn(
        "tabular-nums",
        margin < 0 ? "font-medium text-destructive" : "text-foreground",
        className,
      )}
    >
      {formatPercent(margin)}
    </span>
  );
}
