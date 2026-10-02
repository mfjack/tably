"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserOrganization } from "@/features/organizations/types";
import { PixPaymentCard } from "@/features/subscriptions/components/pix-payment-card";
import { useChooseSubscriptionPlanMutation } from "@/features/subscriptions/hooks/use-choose-subscription-plan-mutation";
import {
  PLAN_DETAILS,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/features/subscriptions/plans";
import {
  getSubscriptionStatusDescription,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/features/subscriptions/subscription-labels";
import {
  getSubscriptionState,
  type Subscription,
} from "@/features/subscriptions/subscription-state";
import { cn } from "@/lib/utils";

type SubscriptionSettingsProps = {
  organization: UserOrganization;
  subscription: Subscription;
};

export function SubscriptionSettings({
  organization,
  subscription,
}: SubscriptionSettingsProps) {
  const choosePlanMutation = useChooseSubscriptionPlanMutation(organization.id);
  const state = getSubscriptionState(subscription);
  const isOwner = organization.role === "owner";
  const planDetails = PLAN_DETAILS[subscription.plan];

  function choosePlan(plan: SubscriptionPlan) {
    choosePlanMutation.mutate(plan, {
      onSuccess: () =>
        toast.success(`Plano ${PLAN_DETAILS[plan].label} escolhido.`),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-lg">Plano {planDetails.label}</h2>
            <p className="text-muted-foreground text-sm">
              {getSubscriptionStatusDescription(state)}
            </p>
          </div>
          <Badge
            variant={
              state.status === "grace" || state.status === "blocked"
                ? "destructive"
                : "secondary"
            }
          >
            {SUBSCRIPTION_STATUS_LABELS[state.status]}
          </Badge>
        </div>
        {state.status === "trial" && (
          <p className="text-muted-foreground text-sm">
            No teste você usa tudo do sistema. Depois, fica liberado o que faz
            parte do plano escolhido.
          </p>
        )}
        {subscription.hasFullAccess && state.status !== "trial" && (
          <p className="text-muted-foreground text-sm">
            Seu estabelecimento tem acesso liberado a todos os módulos.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Escolha o plano</h3>
        <ul className="grid gap-3 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const details = PLAN_DETAILS[plan];
            const isCurrent = plan === subscription.plan;
            return (
              <li
                key={plan}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card p-4",
                  isCurrent && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{details.label}</span>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <span className="font-bold text-2xl">
                  R$ {details.price}
                  <span className="font-normal text-muted-foreground text-sm">
                    /mês
                  </span>
                </span>
                {isCurrent ? (
                  <span className="flex h-10 items-center gap-1.5 text-muted-foreground text-sm">
                    <Check aria-hidden className="size-4" />
                    Plano escolhido
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!isOwner || choosePlanMutation.isPending}
                    onClick={() => choosePlan(plan)}
                  >
                    Escolher {details.label}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {!isOwner && (
          <p className="text-muted-foreground text-sm">
            Só o dono do estabelecimento pode trocar o plano.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Pagamento</h3>
        <PixPaymentCard
          organizationId={organization.id}
          reference={organization.slug}
          amount={subscription.monthlyPrice}
          isPaymentReported={state.isPaymentReported}
        />
        <p className="text-muted-foreground text-sm">
          Depois que confirmarmos o Pix, sua assinatura é renovada por mais um
          mês.
        </p>
      </section>
    </div>
  );
}
