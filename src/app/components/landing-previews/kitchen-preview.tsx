import {
  BellRing,
  Check,
  ChefHat,
  CookingPot,
  Hourglass,
  type LucideIcon,
  PackageCheck,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewTicket = {
  customerName: string;
  elapsed: string;
  isLate?: boolean;
  items: readonly { quantity: number; name: string; note?: string }[];
};

type PreviewColumn = {
  title: string;
  icon: LucideIcon;
  actionLabel: string;
  actionIcon: LucideIcon;
  tickets: readonly PreviewTicket[];
};

const PREVIEW_COLUMNS: readonly PreviewColumn[] = [
  {
    title: "No aguardo",
    icon: Hourglass,
    actionLabel: "Iniciar preparo",
    actionIcon: ChefHat,
    tickets: [
      {
        customerName: "Ana",
        elapsed: "agora",
        items: [
          { quantity: 2, name: "X-Burguer", note: "sem cebola" },
          { quantity: 1, name: "Fritas" },
        ],
      },
      {
        customerName: "João",
        elapsed: "há 2 min",
        items: [{ quantity: 1, name: "Prato do dia" }],
      },
    ],
  },
  {
    title: "Em preparo",
    icon: CookingPot,
    actionLabel: "Pronto",
    actionIcon: Check,
    tickets: [
      {
        customerName: "Carla",
        elapsed: "há 16 min",
        isLate: true,
        items: [
          { quantity: 1, name: "Porção de calabresa" },
          { quantity: 2, name: "Pastel", note: "1 de queijo" },
        ],
      },
    ],
  },
  {
    title: "Pronto",
    icon: BellRing,
    actionLabel: "Entregue",
    actionIcon: PackageCheck,
    tickets: [
      {
        customerName: "Pedro",
        elapsed: "há 9 min",
        items: [{ quantity: 3, name: "Chope" }],
      },
    ],
  },
];

export function KitchenPreview() {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-col">
        <span className="font-bold text-sm">Cozinha</span>
        <span className="text-[0.625rem] text-muted-foreground">
          Pedidos enviados pelo PDV, em tempo real.
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
        {PREVIEW_COLUMNS.map(
          ({
            title,
            icon: Icon,
            actionLabel,
            actionIcon: ActionIcon,
            tickets,
          }) => (
            <div
              key={title}
              className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted/50 p-1.5 sm:p-2"
            >
              <span className="flex items-center gap-1 font-semibold text-[0.625rem]">
                <Icon className="size-3 text-muted-foreground" />
                {title}
                <span className="text-muted-foreground">{tickets.length}</span>
              </span>
              {tickets.map((ticket) => (
                <div
                  key={ticket.customerName}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border bg-card p-1.5 sm:p-2",
                    ticket.isLate && "border-destructive/60",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="truncate font-semibold text-[0.6875rem]">
                      {ticket.customerName}
                    </span>
                    <span
                      className={cn(
                        "text-[0.5625rem] text-muted-foreground",
                        ticket.isLate && "font-medium text-destructive",
                      )}
                    >
                      {ticket.elapsed}
                    </span>
                  </div>
                  {ticket.items.map((item) => (
                    <div key={item.name} className="flex flex-col">
                      <span className="truncate text-[0.625rem]">
                        <strong>{item.quantity}x</strong> {item.name}
                      </span>
                      {item.note && (
                        <span className="truncate font-semibold text-[0.5625rem] text-primary">
                          ↳ {item.note}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <span className="hidden size-5 shrink-0 items-center justify-center rounded-md border sm:flex">
                      <Printer className="size-2.5" />
                    </span>
                    <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary py-1 font-semibold text-[0.5625rem] text-primary-foreground">
                      <ActionIcon className="size-2.5" />
                      <span className="truncate">{actionLabel}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
