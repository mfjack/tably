import { Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPlanPrice,
  LANDING_PLANS,
} from "@/features/landing/landing-info";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function LandingPricing() {
  return (
    <section
      id="planos"
      className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="font-bold text-3xl tracking-tight">Planos</h2>
        <p className="text-muted-foreground">
          Sem taxa de adesão e sem fidelidade. Comece pelo plano que cabe no seu
          momento e mude quando quiser.
        </p>
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
            <p className="flex items-baseline gap-1">
              <span className="font-bold text-4xl tracking-tight">
                {formatPlanPrice(plan.monthlyPrice)}
              </span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </p>
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
              render={<Link href={ROUTES.signUp} />}
            >
              Começar com o {plan.name}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
