import { differenceInMinutes } from "date-fns";
import { Check, PackageCheck, Undo2 } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  KitchenTicket,
  KitchenTicketId,
  KitchenTicketStatus,
} from "@/features/kitchen/types";
import { cn } from "@/lib/utils";

const LATE_TICKET_MINUTES = 15;

type KitchenTicketCardProps = {
  ticket: KitchenTicket;
  now: Date;
  onChangeStatus: (
    ticketId: KitchenTicketId,
    status: KitchenTicketStatus,
  ) => void;
};

function formatElapsedMinutes(minutes: number) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h${(minutes % 60).toString().padStart(2, "0")}`;
}

function KitchenTicketCardComponent({
  ticket,
  now,
  onChangeStatus,
}: KitchenTicketCardProps) {
  const isPreparing = ticket.status === "preparing";
  const elapsedMinutes = Math.max(
    differenceInMinutes(now, new Date(ticket.createdAt)),
    0,
  );
  const isLate = isPreparing && elapsedMinutes >= LATE_TICKET_MINUTES;

  return (
    <article
      aria-label={`Pedido de ${ticket.customerName ?? "cliente"}`}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs",
        isLate && "border-destructive/60",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[1.0625rem]">
            {ticket.customerName ?? "Sem nome"}
          </h3>
          <p
            className={cn(
              "text-muted-foreground text-xs tabular-nums",
              isLate && "font-medium text-destructive",
            )}
          >
            {formatElapsedMinutes(elapsedMinutes)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {ticket.isAddition && <Badge>Adicional</Badge>}
          {ticket.isTakeaway && <Badge variant="secondary">Para levar</Badge>}
        </div>
      </header>

      <ul className="flex flex-col gap-1.5">
        {ticket.items.map((item) => (
          <li key={item.id} className="text-[0.9375rem]">
            <strong className="mr-1.5 font-bold tabular-nums">
              {item.quantity}x
            </strong>
            {item.productName}
          </li>
        ))}
      </ul>

      {ticket.note && (
        <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
          <strong className="font-semibold">Obs:</strong> {ticket.note}
        </p>
      )}

      {isPreparing ? (
        <Button
          type="button"
          className="h-11 rounded-xl font-semibold"
          onClick={() => onChangeStatus(ticket.id, "ready")}
        >
          <Check aria-hidden />
          Pronto
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="Voltar para em preparo"
            onClick={() => onChangeStatus(ticket.id, "preparing")}
          >
            <Undo2 aria-hidden />
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl font-semibold"
            onClick={() => onChangeStatus(ticket.id, "delivered")}
          >
            <PackageCheck aria-hidden />
            Entregue
          </Button>
        </div>
      )}
    </article>
  );
}

export const KitchenTicketCard = memo(KitchenTicketCardComponent);
