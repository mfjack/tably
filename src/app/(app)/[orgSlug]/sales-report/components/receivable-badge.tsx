import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { ReceivablesSummary } from "@/features/finance/receivables";
import { formatCurrency } from "@/lib/format";

export function formatShortDate(dateKey: string): string {
  return format(parseISO(dateKey), "EEE, dd/MM", { locale: ptBR });
}

type ReceivableBadgeProps = {
  summary: ReceivablesSummary;
};

export function ReceivableBadge({ summary }: ReceivableBadgeProps) {
  switch (summary.kind) {
    case "waiting":
      return (
        <Badge variant="outline">
          Cai {formatShortDate(summary.expectedOn)}
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="destructive">
          {summary.count === 1
            ? "Não confirmado"
            : `${summary.count} não confirmados`}
        </Badge>
      );
    case "matched":
      return <Badge variant="success">Conferido</Badge>;
    case "short":
      return (
        <Badge variant="destructive">
          Faltou {formatCurrency(Math.abs(summary.difference))}
        </Badge>
      );
    case "over":
      return (
        <Badge variant="secondary">
          Sobrou {formatCurrency(summary.difference)}
        </Badge>
      );
  }
}
