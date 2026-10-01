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
import {
  menuHeadingFont,
  menuItemFont,
  menuTitleFont,
} from "../../../menu-fonts";

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
    <main className="min-h-svh bg-white text-black">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12 sm:px-12">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1
            className={cn(
              menuTitleFont.className,
              "text-5xl lowercase leading-none sm:text-6xl",
            )}
          >
            {order.menuTitle}
          </h1>
          <p className={cn(menuHeadingFont.className, "text-3xl")}>
            olá, {order.customerName.toLocaleLowerCase("pt-BR")}!
          </p>
        </header>

        <section
          aria-live="polite"
          className={cn(
            menuItemFont.className,
            "flex flex-col gap-6 rounded-2xl border-2 border-black p-6",
          )}
        >
          <p className="text-center font-bold text-lg">
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
                      !isDone && !isCurrent && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-black font-bold text-sm",
                        (isDone || isCurrent) && "bg-black text-white",
                        isCurrent && "animate-pulse",
                      )}
                    >
                      {isDone ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className={cn(isCurrent && "font-bold")}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className={cn(menuItemFont.className, "flex flex-col gap-2")}>
          <h2 className={cn(menuHeadingFont.className, "text-2xl")}>
            seu pedido
          </h2>
          <ul className="flex flex-col gap-1">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.note ?? ""}`}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="lowercase">
                  {item.quantity}x {item.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          {order.note && <p className="text-sm">obs.: {order.note}</p>}
          <p className="flex justify-between border-black border-t-2 pt-2 font-bold">
            <span>total</span>
            <span className="tabular-nums">{formatCurrency(order.total)}</span>
          </p>
          <p className="text-sm">pagamento no balcão.</p>
        </section>

        <Link
          href={`/menu/${order.menuSlug}`}
          className={cn(
            menuItemFont.className,
            "self-center font-bold underline underline-offset-4",
          )}
        >
          voltar ao cardápio
        </Link>
      </div>
    </main>
  );
}
