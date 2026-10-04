import { getPaymentSurcharge } from "@/features/organizations/payment-fees";
import type { OrganizationPaymentFees } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod } from "../types";

type CardSurchargeNoticeProps = {
  paymentFees: OrganizationPaymentFees;
  method: PaymentMethod | undefined;
  amount: number;
};

export function CardSurchargeNotice({
  paymentFees,
  method,
  amount,
}: CardSurchargeNoticeProps) {
  const surcharge = method
    ? getPaymentSurcharge(paymentFees, method, amount)
    : 0;
  if (surcharge <= 0) return null;

  return (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
      Cobre{" "}
      <strong className="font-semibold tabular-nums">
        {formatCurrency(amount + surcharge)}
      </strong>{" "}
      na maquininha
      <span className="text-muted-foreground">
        {" "}
        · inclui {formatCurrency(surcharge)} de taxa
      </span>
    </p>
  );
}
