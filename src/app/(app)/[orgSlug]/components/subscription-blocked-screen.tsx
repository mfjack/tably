import { Lock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  buildWhatsAppUrl,
  LANDING_INFO,
} from "@/features/landing/landing-info";
import type { UserOrganization } from "@/features/organizations/types";
import { PixPaymentCard } from "@/features/subscriptions/components/pix-payment-card";
import { PLAN_DETAILS } from "@/features/subscriptions/plans";
import { getSubscriptionStatusDescription } from "@/features/subscriptions/subscription-labels";
import type {
  Subscription,
  SubscriptionState,
} from "@/features/subscriptions/subscription-state";

type SubscriptionBlockedScreenProps = {
  organization: UserOrganization;
  subscription: Subscription;
  state: SubscriptionState;
};

export function SubscriptionBlockedScreen({
  organization,
  subscription,
  state,
}: SubscriptionBlockedScreenProps) {
  const canPay =
    organization.role === "owner" || organization.role === "manager";

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-semibold text-lg">Tably</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Lock aria-hidden className="size-6" />
            Assinatura de {organization.name} vencida
          </h1>
          <p className="text-muted-foreground">
            {getSubscriptionStatusDescription(state)} Seus dados continuam
            guardados e o acesso volta assim que o pagamento for confirmado.
          </p>
        </div>
        {canPay ? (
          <>
            <PixPaymentCard
              organizationId={organization.id}
              reference={organization.slug}
              amount={state.chargeAmount}
              isPaymentReported={state.isPaymentReported}
            />
            <p className="text-muted-foreground text-sm">
              Plano {PLAN_DETAILS[subscription.plan].label}. Para trocar de
              plano ou tirar dúvidas, fale com a gente.
            </p>
          </>
        ) : (
          <p className="rounded-xl border bg-card p-5 text-sm">
            Peça ao dono ou ao gerente do estabelecimento para regularizar a
            assinatura.
          </p>
        )}
        {LANDING_INFO.whatsappNumber && (
          <Button
            variant="outline"
            className="h-11 self-start"
            nativeButton={false}
            render={
              <Link
                href={buildWhatsAppUrl(
                  LANDING_INFO.whatsappNumber,
                  `Olá! Preciso de ajuda com a assinatura do ${organization.name}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Falar no WhatsApp
          </Button>
        )}
      </div>
    </main>
  );
}
