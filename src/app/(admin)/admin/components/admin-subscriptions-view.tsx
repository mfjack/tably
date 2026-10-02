"use client";

import { format } from "date-fns";
import { BellRing, Pencil, Wallet } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BILLING_CYCLE_MONTHS,
  PLAN_DETAILS,
} from "@/features/subscriptions/plans";
import {
  getSubscriptionStatusDescription,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/features/subscriptions/subscription-labels";
import {
  getSubscriptionState,
  type SubscriptionStatus,
} from "@/features/subscriptions/subscription-state";
import type { AdminSubscription } from "@/features/subscriptions/types";
import { AdminSubscriptionDialog } from "./admin-subscription-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";

type AdminSubscriptionsViewProps = {
  subscriptions: readonly AdminSubscription[];
};

type DialogState =
  | { step: "closed" }
  | { step: "edit"; subscription: AdminSubscription }
  | { step: "payment"; subscription: AdminSubscription };

const STATUS_BADGE_VARIANTS = {
  trial: "secondary",
  active: "default",
  courtesy: "outline",
  grace: "destructive",
  blocked: "destructive",
} as const satisfies Record<
  SubscriptionStatus,
  "default" | "secondary" | "outline" | "destructive"
>;

function formatMoney(amount: number) {
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

export function AdminSubscriptionsView({
  subscriptions,
}: AdminSubscriptionsViewProps) {
  const [dialogState, setDialogState] = useState<DialogState>({
    step: "closed",
  });
  const rows = subscriptions.map((subscription) => ({
    subscription,
    state: getSubscriptionState(subscription),
  }));
  const countByStatus = (status: SubscriptionStatus) =>
    rows.filter((row) => row.state.status === status).length;
  const monthlyRevenue = rows
    .filter((row) => row.state.status === "active")
    .reduce(
      (total, row) =>
        total +
        row.state.chargeAmount /
          BILLING_CYCLE_MONTHS[row.subscription.billingCycle],
      0,
    );
  const summary = [
    { label: "Pagantes", value: String(countByStatus("active")) },
    { label: "Em teste", value: String(countByStatus("trial")) },
    {
      label: "Vencidos ou bloqueados",
      value: String(countByStatus("grace") + countByStatus("blocked")),
    },
    { label: "Receita mensal", value: formatMoney(monthlyRevenue) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 rounded-2xl border bg-card p-4"
          >
            <span className="text-muted-foreground text-sm">{item.label}</span>
            <span className="font-bold text-2xl tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Nenhum cliente ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ subscription, state }) => (
            <li
              key={subscription.organizationId}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{subscription.name}</span>
                  <Badge variant={STATUS_BADGE_VARIANTS[state.status]}>
                    {SUBSCRIPTION_STATUS_LABELS[state.status]}
                  </Badge>
                  {state.isPaymentReported && (
                    <Badge variant="outline" className="gap-1">
                      <BellRing aria-hidden className="size-3" />
                      Informou pagamento
                    </Badge>
                  )}
                </div>
                <span className="truncate text-muted-foreground text-sm">
                  {subscription.ownerEmail ?? "Sem dono"} · desde{" "}
                  {format(new Date(subscription.createdAt), "dd/MM/yyyy")}
                </span>
                <span className="text-sm">
                  {getSubscriptionStatusDescription(state)}
                </span>
                {subscription.notes && (
                  <span className="text-muted-foreground text-sm italic">
                    {subscription.notes}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 lg:w-40 lg:text-right">
                <span className="font-semibold">
                  {PLAN_DETAILS[subscription.plan].label}
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {formatMoney(state.chargeAmount)}
                  {subscription.billingCycle === "yearly" ? "/ano" : "/mês"}
                </span>
                {subscription.payments.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {subscription.payments.length}{" "}
                    {subscription.payments.length === 1
                      ? "pagamento"
                      : "pagamentos"}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => setDialogState({ step: "edit", subscription })}
                >
                  <Pencil aria-hidden />
                  Editar
                </Button>
                <Button
                  className="h-10"
                  onClick={() =>
                    setDialogState({ step: "payment", subscription })
                  }
                >
                  <Wallet aria-hidden />
                  Registrar pagamento
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminSubscriptionDialog
        subscription={
          dialogState.step === "edit" ? dialogState.subscription : null
        }
        onClose={() => setDialogState({ step: "closed" })}
      />
      <RecordPaymentDialog
        subscription={
          dialogState.step === "payment" ? dialogState.subscription : null
        }
        onClose={() => setDialogState({ step: "closed" })}
      />
    </div>
  );
}
