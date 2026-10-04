"use client";

import { type Control, useWatch } from "react-hook-form";
import { usePublicLoyaltyStatusQuery } from "@/features/loyalty/hooks/use-public-loyalty-status-query";
import type { PublicLoyaltyProgram } from "@/features/menu/types";
import type { OnlineOrderCustomerInput } from "@/features/online-orders/schemas";
import { cn } from "@/lib/utils";

type MenuOrderLoyaltyHintProps = {
  menuSlug: string;
  program: PublicLoyaltyProgram;
  control: Control<OnlineOrderCustomerInput>;
};

function formatStamps(stamps: number) {
  return `${stamps} ${stamps === 1 ? "selo" : "selos"}`;
}

export function MenuOrderLoyaltyHint({
  menuSlug,
  program,
  control,
}: MenuOrderLoyaltyHintProps) {
  const phone = useWatch({ control, name: "customerPhone" });
  const statusQuery = usePublicLoyaltyStatusQuery(menuSlug, phone);
  const status = statusQuery.data;

  if (!status) return null;

  const missingStamps = program.stampsRequired - status.balance;
  const hasReward = missingStamps <= 0;

  return (
    <p
      className={cn(
        "-mt-3 rounded-lg px-3 py-2 text-xs",
        hasReward ? "bg-primary/10 font-medium text-primary" : "bg-muted",
      )}
    >
      {hasReward
        ? `Você tem um prêmio para usar: ${program.rewardDescription}. Peça no caixa.`
        : status.hasStampToday
          ? `Você já ganhou o selo de hoje. Faltam ${formatStamps(missingStamps)} para ganhar ${program.rewardDescription}.`
          : `Faltam ${formatStamps(missingStamps)} para ganhar ${program.rewardDescription}. Este pedido soma 1 selo quando for pago.`}
    </p>
  );
}
