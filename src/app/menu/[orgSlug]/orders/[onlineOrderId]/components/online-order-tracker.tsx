"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useOnlineOrderStatusQuery } from "@/features/online-orders/hooks/use-online-order-status-query";
import type {
  OnlineOrderStage,
  PublicOnlineOrder,
} from "@/features/online-orders/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type OnlineOrderTrackerProps = {
  onlineOrderId: string;
  initialOrder: PublicOnlineOrder;
};

const PROGRESS_STEPS = [
  { stage: "pending", label: "Pedido enviado" },
  { stage: "waiting", label: "Confirmado" },
  { stage: "preparing", label: "Preparando" },
  { stage: "ready", label: "Pronto" },
] as const satisfies ReadonlyArray<{ stage: OnlineOrderStage; label: string }>;

const STAGE_POSITIONS = {
  pending: 0,
  waiting: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
  rejected: -1,
} as const satisfies Record<OnlineOrderStage, number>;

const STAGE_MESSAGES = {
  pending:
    "Recebemos seu pedido! Assim que o balcão confirmar, ele vai pra cozinha.",
  waiting: "Pedido confirmado! Ele já está na fila da cozinha.",
  preparing: "Estamos preparando seu pedido.",
  ready: "Seu pedido está pronto! Pode retirar no balcão.",
  delivered: "Pedido entregue. Bom apetite!",
  rejected:
    "Não conseguimos aceitar esse pedido pelo cardápio. Fale com a gente no balcão.",
} as const satisfies Record<OnlineOrderStage, string>;

const READY_VIBRATION_PATTERN = [200, 100, 200];

export function OnlineOrderTracker({
  onlineOrderId,
  initialOrder,
}: OnlineOrderTrackerProps) {
  const { data: order } = useOnlineOrderStatusQuery(
    onlineOrderId,
    initialOrder,
  );
  const previousStageRef = useRef(order.stage);
  const stagePosition = STAGE_POSITIONS[order.stage];
  const isRejected = order.stage === "rejected";

  useEffect(() => {
    if (order.stage === "ready" && previousStageRef.current !== "ready") {
      navigator.vibrate?.(READY_VIBRATION_PATTERN);
    }
    previousStageRef.current = order.stage;
  }, [order.stage]);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            {order.menuTitle}
          </h1>
          <p className="text-muted-foreground">Olá, {order.customerName}!</p>
        </header>

        <section
          aria-live="polite"
          className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs"
        >
          <p className="text-center font-semibold text-lg">
            {STAGE_MESSAGES[order.stage]}
          </p>
          {!isRejected && (
            <ol className="flex flex-col gap-3">
              {PROGRESS_STEPS.map((step, index) => {
                const isDone = stagePosition > index;
                const isCurrent = stagePosition === index;
                return (
                  <li
                    key={step.stage}
                    className={cn(
                      "flex items-center gap-3",
                      !isDone && !isCurrent && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border font-semibold text-sm",
                        (isDone || isCurrent) &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent && "animate-pulse",
                      )}
                    >
                      {isDone ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className={cn(isCurrent && "font-semibold")}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold text-lg">Seu pedido</h2>
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.note ?? ""}`}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex min-w-0 flex-col">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  {item.note && (
                    <span className="text-primary text-xs">↳ {item.note}</span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          {order.note && (
            <p className="text-muted-foreground text-sm">Obs.: {order.note}</p>
          )}
          <p className="flex justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(order.total)}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            O pagamento é feito no balcão.
          </p>
        </section>

        <Link
          href={`/menu/${order.menuSlug}`}
          className="self-center font-medium text-sm underline underline-offset-4"
        >
          Voltar ao cardápio
        </Link>
      </div>
    </main>
  );
}
