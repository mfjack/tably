"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextareaField } from "@/components/form/textarea-field";
import type { OrganizationId } from "@/features/organizations/types";
import { useVoidPunchMutation } from "@/features/time-clock/hooks/use-void-punch-mutation";
import {
  type VoidPunchInput,
  voidPunchSchema,
} from "@/features/time-clock/schemas";
import {
  formatClockTime,
  getZonedParts,
} from "@/features/time-clock/time-utils";
import type { TimesheetPunch } from "@/features/time-clock/timesheet";
import { formatDateKey } from "@/lib/format";

type PunchDetailsDialogProps = {
  organizationId: OrganizationId;
  punch: TimesheetPunch | null;
  timeZone: string;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{value}</dd>
    </>
  );
}

function formatZonedDateTime(isoDate: string, timeZone: string) {
  const zoned = getZonedParts(isoDate, timeZone);
  return `${formatDateKey(zoned.date)} ${zoned.time}:${zoned.seconds}`;
}

export function PunchDetailsDialog({
  organizationId,
  punch,
  timeZone,
  onClose,
}: PunchDetailsDialogProps) {
  const voidMutation = useVoidPunchMutation(organizationId);
  const form = useForm<VoidPunchInput>({
    resolver: zodResolver(voidPunchSchema),
    defaultValues: { reason: "" },
  });
  const isVoided = punch?.voiding != null;

  useEffect(() => {
    if (!punch) return;
    form.reset({ reason: "" });
    voidMutation.reset();
  }, [punch, form, voidMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!punch || isVoided) {
      onClose();
      return;
    }
    voidMutation.mutate(
      { punchId: punch.id, input: values },
      {
        onSuccess: () => {
          toast.success("Marcação desconsiderada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={punch !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={`Marcação das ${punch ? formatClockTime(punch.localTime) : ""}`}
      description="Marcações nunca são apagadas. Se estiver errada, desconsidere com um motivo: ela continua guardada e aparece no espelho."
      submitLabel={isVoided ? "Fechar" : "Desconsiderar"}
      isSubmitting={voidMutation.isPending}
      onSubmit={handleSubmit}
    >
      {punch && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border p-4 text-sm">
            <DetailRow label="NSR" value={punch.nsr.toString()} />
            <DetailRow
              label="Horário"
              value={formatZonedDateTime(punch.punchedAt, timeZone)}
            />
            <DetailRow
              label="Origem"
              value={punch.source === "manual" ? "Ajuste manual" : "Relógio"}
            />
            {punch.source === "manual" && (
              <>
                <DetailRow label="Motivo" value={punch.reason ?? ""} />
                <DetailRow
                  label="Incluída em"
                  value={`${formatZonedDateTime(punch.createdAt, timeZone)}${punch.recordedByName ? ` por ${punch.recordedByName}` : ""}`}
                />
              </>
            )}
            {punch.voiding && (
              <>
                <DetailRow
                  label="Desconsiderada"
                  value={punch.voiding.reason}
                />
                <DetailRow
                  label="Em"
                  value={`${formatZonedDateTime(punch.voiding.voidedAt, timeZone)}${punch.voiding.voidedByName ? ` por ${punch.voiding.voidedByName}` : ""}`}
                />
              </>
            )}
            <dt className="text-muted-foreground">Código</dt>
            <dd className="min-w-0 break-all text-right font-mono text-xs">
              {punch.hash}
            </dd>
          </dl>
          {!isVoided && (
            <TextareaField
              control={form.control}
              name="reason"
              label="Motivo para desconsiderar"
              placeholder="Ex.: Marcou duas vezes por engano"
            />
          )}
        </div>
      )}
    </FormDialog>
  );
}
