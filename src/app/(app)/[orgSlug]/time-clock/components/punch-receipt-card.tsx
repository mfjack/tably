"use client";

import { CircleCheck, Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import {
  getPunchLabel,
  printPunchReceipt,
} from "@/features/time-clock/print-punch-receipt";
import { getZonedParts } from "@/features/time-clock/time-utils";
import type { PunchReceipt } from "@/features/time-clock/types";
import { formatDateKey } from "@/lib/format";
import { formatCpf } from "@/lib/masks";

const AUTO_CLOSE_DELAY_IN_MS = 15000;
const HASH_PREVIEW_LENGTH = 16;

type PunchReceiptCardProps = {
  receipt: PunchReceipt;
  business: OrderTicketBusiness;
  timeZone: string;
  onDone: () => void;
};

export function PunchReceiptCard({
  receipt,
  business,
  timeZone,
  onDone,
}: PunchReceiptCardProps) {
  const zoned = getZonedParts(receipt.punchedAt, timeZone);
  const punchLabel = getPunchLabel(receipt.dayPunches.length - 1);

  useEffect(() => {
    const timeoutId = window.setTimeout(onDone, AUTO_CLOSE_DELAY_IN_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onDone]);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <CircleCheck aria-hidden className="size-12" />
        <h2 className="font-semibold text-xl">{punchLabel} registrada</h2>
        <p className="text-muted-foreground text-sm">
          {receipt.employeeName}, seu ponto foi salvo às{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {zoned.time}
          </span>
          .
        </p>
      </div>

      <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border bg-card p-4 text-sm">
        <dt className="text-muted-foreground">CPF</dt>
        <dd className="text-right tabular-nums">
          {formatCpf(receipt.employeeCpf)}
        </dd>
        <dt className="text-muted-foreground">Data</dt>
        <dd className="text-right tabular-nums">
          {formatDateKey(zoned.date)} {zoned.time}:{zoned.seconds}
        </dd>
        <dt className="text-muted-foreground">NSR</dt>
        <dd className="text-right tabular-nums">
          {receipt.nsr.toString().padStart(9, "0")}
        </dd>
        <dt className="text-muted-foreground">Código</dt>
        <dd className="truncate text-right font-mono text-xs leading-5">
          {receipt.hash.slice(0, HASH_PREVIEW_LENGTH)}…
        </dd>
        <dt className="col-span-2 border-t pt-2 text-muted-foreground">
          Marcações do dia
        </dt>
        <dd className="col-span-2 flex flex-wrap gap-2">
          {receipt.dayPunches.map((punchedAt, index) => (
            <span
              key={punchedAt}
              className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums"
            >
              {getPunchLabel(index)} · {getZonedParts(punchedAt, timeZone).time}
            </span>
          ))}
        </dd>
      </dl>

      <div className="grid w-full grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => printPunchReceipt(receipt, business, timeZone)}
        >
          <Printer aria-hidden />
          Comprovante
        </Button>
        <Button className="h-11" onClick={onDone}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
