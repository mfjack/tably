"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrganizationId } from "@/features/organizations/types";
import { useTemperatureRecordsQuery } from "@/features/tasks/hooks/use-temperature-records-query";
import { printTemperatureLog } from "@/features/tasks/print-temperature-log";
import {
  describeTemperatureRange,
  formatTemperature,
  isTemperatureOutOfRange,
} from "@/features/tasks/task-temperature";
import { cn } from "@/lib/utils";

type TemperatureLogDialogProps = {
  organizationId: OrganizationId;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
};

export function TemperatureLogDialog({
  organizationId,
  businessName,
  isOpen,
  onClose,
}: TemperatureLogDialogProps) {
  const recordsQuery = useTemperatureRecordsQuery(organizationId, isOpen);
  const records = recordsQuery.data ?? [];
  const outOfRangeCount = records.filter((record) =>
    isTemperatureOutOfRange(record.temperature, record),
  ).length;

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Temperaturas dos últimos 30 dias"
      size="large"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={records.length === 0}
            onClick={() => printTemperatureLog(businessName, records)}
          >
            <Printer aria-hidden />
            Imprimir planilha
          </Button>
        </>
      }
    >
      {recordsQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{recordsQuery.error.message}</AlertDescription>
        </Alert>
      ) : recordsQuery.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : records.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          Nenhuma temperatura registrada ainda. Adicione o modelo "Controle de
          temperatura" ou crie itens do tipo temperatura nos seus processos.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            {records.length} registros
            {outOfRangeCount > 0 && (
              <span className="font-medium text-destructive">
                {" "}
                · {outOfRangeCount} fora do limite
              </span>
            )}
            . A planilha impressa serve como registro para a vigilância
            sanitária.
          </p>
          <ul className="flex flex-col divide-y rounded-xl border">
            {records.map((record) => {
              const isOut = isTemperatureOutOfRange(record.temperature, record);
              return (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{record.taskTitle}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {format(parseISO(record.completedOn), "EEE dd/MM", {
                        locale: ptBR,
                      })}{" "}
                      às {format(new Date(record.completedAt), "HH:mm")}
                      {record.operatorName && ` · ${record.operatorName}`}
                      {` · limite ${describeTemperatureRange(record)}`}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold text-sm tabular-nums",
                      isOut && "text-destructive",
                    )}
                  >
                    {formatTemperature(record.temperature)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DetailsDialog>
  );
}
