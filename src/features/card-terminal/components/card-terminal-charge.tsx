"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getPaymentMethodLabel } from "@/features/orders/payment-methods";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";
import { cancelCardTerminalCharge } from "../actions";
import { useCancelCardTerminalChargeMutation } from "../hooks/use-cancel-card-terminal-charge-mutation";
import { useCardTerminalChargeQuery } from "../hooks/use-card-terminal-charge-query";
import { useStartCardTerminalChargeMutation } from "../hooks/use-start-card-terminal-charge-mutation";
import type { CardTerminalChargeId, CardTerminalMethod } from "../types";

type CardTerminalChargeProps = {
  organizationId: OrganizationId;
  method: CardTerminalMethod;
  amount: number;
  canStart: () => Promise<boolean>;
  onPaid: (method: CardTerminalMethod) => void;
};

export function CardTerminalCharge({
  organizationId,
  method,
  amount,
  canStart,
  onPaid,
}: CardTerminalChargeProps) {
  const [chargeId, setChargeId] = useState<CardTerminalChargeId | null>(null);
  const pendingChargeIdRef = useRef<CardTerminalChargeId | null>(null);
  const onPaidRef = useRef(onPaid);
  const startMutation = useStartCardTerminalChargeMutation(organizationId);
  const cancelMutation = useCancelCardTerminalChargeMutation(organizationId);
  const chargeQuery = useCardTerminalChargeQuery(organizationId, chargeId);
  const chargeStatus = chargeQuery.data?.status;
  const paidMethod =
    chargeQuery.data?.status === "paid" ? chargeQuery.data.method : null;

  useEffect(
    () => () => {
      const pendingChargeId = pendingChargeIdRef.current;
      if (pendingChargeId) {
        void cancelCardTerminalCharge(organizationId, pendingChargeId);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    onPaidRef.current = onPaid;
  });

  useEffect(() => {
    if (!paidMethod) return;
    pendingChargeIdRef.current = null;
    onPaidRef.current(paidMethod);
  }, [paidMethod]);

  useEffect(() => {
    if (chargeStatus !== "canceled") return;
    pendingChargeIdRef.current = null;
    setChargeId(null);
    toast.info("A cobrança foi cancelada na maquininha.");
  }, [chargeStatus]);

  async function startCharge() {
    if (!(await canStart())) return;
    startMutation.mutate(
      { amount, method },
      {
        onSuccess: (createdChargeId) => {
          pendingChargeIdRef.current = createdChargeId;
          setChargeId(createdChargeId);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function cancelCharge() {
    if (!chargeId) return;
    cancelMutation.mutate(chargeId, {
      onSuccess: (charge) => {
        if (charge.status === "paid") return;
        pendingChargeIdRef.current = null;
        setChargeId(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  if (chargeId) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3"
      >
        <Spinner aria-hidden className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-sm">
            Aguardando o pagamento na maquininha
          </span>
          <span className="text-muted-foreground text-xs">
            {formatCurrency(amount)} no {getPaymentMethodLabel(method)}
            {chargeQuery.isError && " · reconectando…"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={cancelMutation.isPending}
          onClick={cancelCharge}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      isLoading={startMutation.isPending}
      onClick={startCharge}
    >
      <Smartphone aria-hidden />
      Cobrar {formatCurrency(amount)} na maquininha
    </Button>
  );
}
