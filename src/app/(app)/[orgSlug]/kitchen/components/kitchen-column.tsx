import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  KitchenTicket,
  KitchenTicketId,
  KitchenTicketStatus,
} from "@/features/kitchen/types";
import { KitchenTicketCard } from "./kitchen-ticket-card";

const LOADING_CARD_COUNT = 3;

type KitchenColumnProps = {
  title: string;
  emptyMessage: string;
  icon: LucideIcon;
  tickets: readonly KitchenTicket[];
  isLoading: boolean;
  now: Date;
  onChangeStatus: (
    ticketId: KitchenTicketId,
    status: KitchenTicketStatus,
  ) => void;
};

export function KitchenColumn({
  title,
  emptyMessage,
  icon: Icon,
  tickets,
  isLoading,
  now,
  onChangeStatus,
}: KitchenColumnProps) {
  return (
    <section
      aria-label={title}
      className="flex min-h-0 flex-col rounded-2xl bg-muted/40 p-4"
    >
      <h2 className="flex items-center gap-2 px-1 pb-4 font-semibold text-base">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        {title}
        <span className="text-muted-foreground tabular-nums">
          {isLoading ? "" : tickets.length}
        </span>
      </h2>

      <div className="-m-1 flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
            {Array.from({ length: LOADING_CARD_COUNT }, (_, cardIndex) => (
              <Skeleton
                key={`loading-${cardIndex.toString()}`}
                className="h-48 rounded-2xl"
              />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-10 text-center text-muted-foreground text-sm">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] content-start gap-4">
            {tickets.map((ticket) => (
              <KitchenTicketCard
                key={ticket.id}
                ticket={ticket}
                now={now}
                onChangeStatus={onChangeStatus}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
