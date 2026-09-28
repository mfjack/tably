import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getExpiryStatus } from "@/features/ingredients/expiry";

type ExpiryCellProps = {
  expiresAt: string | null;
};

function getExpiringLabel(daysLeft: number) {
  if (daysLeft === 0) return "Vence hoje";
  if (daysLeft === 1) return "Vence amanhã";
  return `Vence em ${daysLeft} dias`;
}

export function ExpiryCell({ expiresAt }: ExpiryCellProps) {
  const expiryStatus = getExpiryStatus(expiresAt);

  if (!expiresAt || expiryStatus.status === "none") {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">
        {format(parseISO(expiresAt), "dd/MM/yyyy")}
      </span>
      {expiryStatus.status === "expired" && (
        <Badge variant="destructive">Vencido</Badge>
      )}
      {expiryStatus.status === "expiring" && (
        <Badge variant="outline">
          {getExpiringLabel(expiryStatus.daysLeft)}
        </Badge>
      )}
    </div>
  );
}
