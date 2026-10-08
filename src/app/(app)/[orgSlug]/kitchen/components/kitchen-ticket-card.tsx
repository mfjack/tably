import { Check, ChefHat, PackageCheck, Printer, Undo2 } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getElapsedMinutes,
  getTicketDelayLevel,
} from "@/features/kitchen/ticket-delay";
import type {
  KitchenTicket,
  KitchenTicketId,
  KitchenTicketStatus,
} from "@/features/kitchen/types";
import { ItemAddonNames } from "@/features/product-addons/components/item-addon-names";
import { cn } from "@/lib/utils";

type KitchenTicketCardProps = {
  ticket: KitchenTicket;
  now: Date;
  lateMinutes: number;
  onChangeStatus: (
    ticketId: KitchenTicketId,
    status: KitchenTicketStatus,
  ) => void;
  onPrint: (ticket: KitchenTicket) => void;
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
  lateMinutes,
  onChangeStatus,
  onPrint,
}: KitchenTicketCardProps) {
  const isWaiting = ticket.status === "waiting";
  const isPreparing = ticket.status === "preparing";
  const elapsedMinutes = getElapsedMinutes(ticket, now);
  const delayLevel = getTicketDelayLevel(ticket, now, lateMinutes);
  const isLate = delayLevel === "late";
  const needsAttention = delayLevel === "attention";

  return (
    <article
      aria-label={`Pedido de ${ticket.customerName ?? "cliente"}`}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs",
        needsAttention && "border-2 border-warning bg-warning/10",
        isLate && "border-2 border-destructive bg-destructive/10",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-lg">
            {ticket.customerName ?? "Sem nome"}
          </h3>
          <p
            className={cn(
              "text-muted-foreground text-xs tabular-nums",
              needsAttention && "font-semibold text-warning",
              isLate && "font-semibold text-destructive",
            )}
          >
            {formatElapsedMinutes(elapsedMinutes)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {isLate && <Badge variant="destructive">Atrasado</Badge>}
          {ticket.isAddition && <Badge>Adicional</Badge>}
          {ticket.isTakeaway && <Badge variant="secondary">Para levar</Badge>}
        </div>
      </header>

      <ul className="flex flex-col gap-1.5">
        {ticket.items.map((item) => (
          <li key={item.id} className="text-base">
            <strong className="mr-1.5 font-bold tabular-nums">
              {item.quantity}x
            </strong>
            {item.productName}
            <ItemAddonNames
              addonNames={item.addonNames}
              className="font-semibold text-sm"
            />
            {item.note && (
              <span className="mt-0.5 block font-semibold text-primary text-sm">
                ↳ {item.note}
              </span>
            )}
          </li>
        ))}
      </ul>

      {ticket.note && (
        <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
          <strong className="font-semibold">Obs:</strong> {ticket.note}
        </p>
      )}

      <div className="mt-auto flex gap-2">
        {!isWaiting && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            aria-label={
              isPreparing ? "Voltar para no aguardo" : "Voltar para em preparo"
            }
            onClick={() =>
              onChangeStatus(ticket.id, isPreparing ? "waiting" : "preparing")
            }
          >
            <Undo2 aria-hidden />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-xl"
          aria-label={`Imprimir pedido de ${ticket.customerName ?? "cliente"}`}
          onClick={() => onPrint(ticket)}
        >
          <Printer aria-hidden />
        </Button>
        {isWaiting && (
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl font-semibold"
            onClick={() => onChangeStatus(ticket.id, "preparing")}
          >
            <ChefHat aria-hidden />
            Iniciar preparo
          </Button>
        )}
        {isPreparing && (
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl font-semibold"
            onClick={() => onChangeStatus(ticket.id, "ready")}
          >
            <Check aria-hidden />
            Pronto
          </Button>
        )}
        {!isWaiting && !isPreparing && (
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl font-semibold"
            onClick={() => onChangeStatus(ticket.id, "delivered")}
          >
            <PackageCheck aria-hidden />
            Entregue
          </Button>
        )}
      </div>
    </article>
  );
}

export const KitchenTicketCard = memo(KitchenTicketCardComponent);
