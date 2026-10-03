"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMonthlyEquivalent,
  formatPlanPrice,
  LANDING_PLANS,
} from "@/features/landing/landing-info";
import { buildPlanSelectionQuery } from "@/features/subscriptions/plans";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PricingCycle = "monthly" | "yearly";

const PRICING_CYCLES = [
  { id: "monthly", label: "Mensal" },
  { id: "yearly", label: "Anual" },
] as const satisfies readonly { id: PricingCycle; label: string }[];

export function LandingPricing() {
  const [cycle, setCycle] = useState<PricingCycle>("monthly");
  const isYearly = cycle === "yearly";

  return (
    <section
      id="planos"
      className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-bold text-3xl tracking-tight">Planos</h2>
          <p className="text-muted-foreground">
            Sem taxa de adesão e sem fidelidade. Comece pelo plano que cabe no
            seu momento e mude quando quiser.
          </p>
        </div>
        <fieldset
          aria-label="Forma de cobrança"
          className="flex self-start rounded-full border bg-muted p-1 md:self-auto"
        >
          {PRICING_CYCLES.map((option) => {
            const isActive = option.id === cycle;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full px-4 font-medium text-sm transition-colors",
                  isActive
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setCycle(option.id)}
              >
                {option.label}
                {option.id === "yearly" && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                    2 meses grátis
                  </span>
                )}
              </button>
            );
          })}
        </fieldset>
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {LANDING_PLANS.map((plan) => (
          <li
            key={plan.name}
            className={cn(
              "flex flex-col gap-6 rounded-2xl border bg-card p-6",
              plan.isHighlighted &&
                "border-primary shadow-lg ring-1 ring-primary",
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                {plan.isHighlighted && <Badge>Mais escolhido</Badge>}
              </div>
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="flex items-baseline gap-1">
                <span className="font-bold text-4xl tracking-tight">
                  {formatPlanPrice(
                    isYearly ? plan.yearlyPrice : plan.monthlyPrice,
                  )}
                </span>
                <span className="text-muted-foreground text-sm">
                  {isYearly ? "/ano" : "/mês"}
                </span>
              </p>
              <p
                className={cn(
                  "text-muted-foreground text-sm",
                  !isYearly && "invisible",
                )}
              >
                Equivale a {formatMonthlyEquivalent(plan.yearlyPrice)}/mês
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.isHighlighted ? "default" : "outline"}
              className="h-11"
              nativeButton={false}
              render={
                <Link
                  href={`${ROUTES.signUp}?${buildPlanSelectionQuery({ plan: plan.id, billingCycle: cycle })}`}
                />
              }
            >
              Testar 14 dias grátis
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
