"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OrganizationId } from "@/features/organizations/types";
import { createQrCodeDataUrl } from "@/lib/qr-code";
import { useReportSubscriptionPaymentMutation } from "../hooks/use-report-subscription-payment-mutation";
import { buildPixPayload, PIX_RECEIVER } from "../pix-payment";

const QR_CODE_SIZE_IN_PIXELS = 480;

type PixPaymentCardProps = {
  organizationId: OrganizationId;
  reference: string;
  amount: number;
  isPaymentReported: boolean;
};

function formatAmount(amount: number) {
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

export function PixPaymentCard({
  organizationId,
  reference,
  amount,
  isPaymentReported,
}: PixPaymentCardProps) {
  const reportMutation = useReportSubscriptionPaymentMutation(organizationId);
  const payload = useMemo(
    () => buildPixPayload(amount, reference),
    [amount, reference],
  );
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    createQrCodeDataUrl(payload, { width: QR_CODE_SIZE_IN_PIXELS, margin: 1 })
      .then((dataUrl) => {
        if (isCurrent) setQrCodeUrl(dataUrl);
      })
      .catch(() => setQrCodeUrl(null));
    return () => {
      isCurrent = false;
    };
  }, [payload]);

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  function reportPayment() {
    reportMutation.mutate(undefined, {
      onSuccess: () =>
        toast.success("Pagamento informado. Vamos confirmar em breve."),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
      {qrCodeUrl && (
        // biome-ignore lint/performance/noImgElement: QR Code gerado no navegador como data URL.
        <img
          src={qrCodeUrl}
          alt={`QR Code Pix de ${formatAmount(amount)}`}
          className="size-44 shrink-0 self-center rounded-lg border"
        />
      )}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-lg">
            Pague {formatAmount(amount)} com Pix
          </span>
          <span className="text-muted-foreground text-sm">
            Aponte a câmera do app do banco para o QR Code ou use o Pix copia e
            cola. Chave: {PIX_RECEIVER.displayKey}.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={copyPayload}
          >
            <Copy aria-hidden />
            Copiar código Pix
          </Button>
          {isPaymentReported ? (
            <span className="flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 font-medium text-primary text-sm">
              <CheckCircle2 aria-hidden className="size-4" />
              Pagamento informado, aguardando confirmação
            </span>
          ) : (
            <Button
              type="button"
              className="h-10"
              disabled={reportMutation.isPending}
              onClick={reportPayment}
            >
              <CheckCircle2 aria-hidden />
              Já paguei
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
