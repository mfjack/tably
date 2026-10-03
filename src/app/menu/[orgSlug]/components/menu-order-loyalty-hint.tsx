"use client";

import { type Control, useWatch } from "react-hook-form";
import { usePublicLoyaltyStatusQuery } from "@/features/loyalty/hooks/use-public-loyalty-status-query";
import type { PublicLoyaltyProgram } from "@/features/menu/types";
import type { OnlineOrderCustomerInput } from "@/features/online-orders/schemas";

type MenuOrderLoyaltyHintProps = {
  menuSlug: string;
  program: PublicLoyaltyProgram;
  control: Control<OnlineOrderCustomerInput>;
};

export function MenuOrderLoyaltyHint({
  menuSlug,
  program,
  control,
}: MenuOrderLoyaltyHintProps) {
  const phone = useWatch({ control, name: "customerPhone" });
  const statusQuery = usePublicLoyaltyStatusQuery(menuSlug, phone);
  const status = statusQuery.data;

  if (!status) return null;

  return (
    <p className="-mt-3 rounded-lg bg-muted px-3 py-2 text-xs">
      {status.hasStampToday
        ? "Você já ganhou o selo de hoje. Este pedido não soma outro selo."
        : `Você tem ${status.balance} de ${program.stampsRequired} selos. Este pedido soma 1 selo quando for pago.`}
    </p>
  );
}
