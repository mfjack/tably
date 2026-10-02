import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { getSubscriptionStatusDescription } from "@/features/subscriptions/subscription-labels";
import type { SubscriptionState } from "@/features/subscriptions/subscription-state";
import { cn } from "@/lib/utils";

type SubscriptionBannerProps = {
  organizationSlug: string;
  state: SubscriptionState;
  canManage: boolean;
};

export function SubscriptionBanner({
  organizationSlug,
  state,
  canManage,
}: SubscriptionBannerProps) {
  const isOverdue = state.status === "grace";

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm",
        isOverdue
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/5 text-foreground",
      )}
    >
      <span className="flex items-center gap-1.5">
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        {getSubscriptionStatusDescription(state)}
      </span>
      {canManage && (
        <Link
          href={`/${organizationSlug}/settings?tab=subscription`}
          className="font-semibold underline underline-offset-4"
        >
          {state.isPaymentReported ? "Ver assinatura" : "Pagar com Pix"}
        </Link>
      )}
    </div>
  );
}
