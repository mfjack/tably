import { format } from "date-fns";
import { Printer } from "lucide-react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import {
  getOrderCustomerLabel,
  getOrderPaymentChange,
} from "@/features/orders/order-details-ticket";
import { LOYALTY_REWARD_PAYMENT_LABEL } from "@/features/orders/order-payments";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrderDetails } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrderInfoList } from "./order-info-list";
import { OrderItemsList } from "./order-items-list";

type PaidOrderDialogProps = {
  order: OrderDetails | null;
  onClose: () => void;
  onPrint: (order: OrderDetails) => void;
};

export function PaidOrderDialog({
  order,
  onClose,
  onPrint,
}: PaidOrderDialogProps) {
  const change = order ? getOrderPaymentChange(order) : 0;
  const paymentLineCount = order
    ? order.payments.length + (order.loyaltyReward > 0 ? 1 : 0)
    : 0;

  return (
    <DetailsDialog
      isOpen={order !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Detalhes da comanda"
      footer={
        <Button
          type="button"
          className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
          onClick={() => order && onPrint(order)}
        >
          <Printer aria-hidden />
          Imprimir
        </Button>
      }
    >
      {order && (
        <div className="flex flex-col gap-5">
          <OrderInfoList
            rows={[
              { label: "Cliente", value: getOrderCustomerLabel(order) },
              {
                label: "Data",
                value: format(
                  new Date(order.paidAt ?? order.createdAt),
                  "dd/MM/yyyy, HH:mm:ss",
                ),
              },
              {
                label: "Atendente",
                value: order.cashierName ?? order.attendantName ?? "—",
              },
              ...(order.note ? [{ label: "Obs", value: order.note }] : []),
            ]}
          />
          <OrderItemsList order={order} />
          {paymentLineCount > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm">
                {paymentLineCount > 1
                  ? "Formas de pagamento"
                  : "Forma de pagamento"}
              </h3>
              <ul className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3 text-sm">
                {order.payments.map((payment, index) => (
                  <li
                    key={`${payment.method}-${index.toString()}`}
                    className="flex justify-between gap-3"
                  >
                    <span>{getPaymentMethodLabel(payment.method)}</span>
                    <span className="tabular-nums">
                      {formatCurrency(
                        (payment.amountReceived ?? payment.amount) +
                          payment.surcharge,
                      )}
                    </span>
                  </li>
                ))}
                {order.loyaltyReward > 0 && (
                  <li className="flex justify-between gap-3">
                    <span>{LOYALTY_REWARD_PAYMENT_LABEL}</span>
                    <span className="tabular-nums">
                      {formatCurrency(order.loyaltyReward)}
                    </span>
                  </li>
                )}
                {change > 0 && (
                  <li className="flex justify-between gap-3 text-muted-foreground">
                    <span>Troco</span>
                    <span className="tabular-nums">
                      {formatCurrency(change)}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>
      )}
    </DetailsDialog>
  );
}
