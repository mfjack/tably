"use client";

import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteWorkScheduleMutation } from "@/features/employees/hooks/use-delete-work-schedule-mutation";
import type { WorkSchedule } from "@/features/employees/types";
import { describeWorkSchedule } from "@/features/employees/work-schedule-labels";
import type { OrganizationId } from "@/features/organizations/types";
import { WorkScheduleFormDialog } from "./work-schedule-form-dialog";

type ScheduleFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; schedule: WorkSchedule };

type WorkSchedulesDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  workSchedules: WorkSchedule[] | undefined;
  onClose: () => void;
};

export function WorkSchedulesDialog({
  organizationId,
  isOpen,
  workSchedules,
  onClose,
}: WorkSchedulesDialogProps) {
  const deleteMutation = useDeleteWorkScheduleMutation(organizationId);
  const [formState, setFormState] = useState<ScheduleFormState>({
    mode: "closed",
  });
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkSchedule | null>(
    null,
  );

  function confirmDelete() {
    if (!scheduleToDelete) return;
    deleteMutation.mutate(scheduleToDelete.id, {
      onSuccess: () => {
        toast.success(`Jornada ${scheduleToDelete.name} excluída.`);
        setScheduleToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <DetailsDialog
        isOpen={isOpen}
        onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
        title="Jornadas de trabalho"
        size="large"
        footer={
          <>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className={DIALOG_ACTION_BUTTON_CLASS_NAME}
                />
              }
            >
              Fechar
            </DialogClose>
            <Button
              className={DIALOG_ACTION_BUTTON_CLASS_NAME}
              onClick={() => setFormState({ mode: "create" })}
            >
              <Plus aria-hidden />
              Nova jornada
            </Button>
          </>
        }
      >
        {!workSchedules ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : workSchedules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
            <CalendarClock
              aria-hidden
              className="size-6 text-muted-foreground"
            />
            <p className="font-medium text-sm">Nenhuma jornada ainda</p>
            <p className="text-muted-foreground text-sm">
              Crie o horário contratual, como "Comercial 44h" ou "Escala 6x1".
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {workSchedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-sm">
                    {schedule.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {describeWorkSchedule(schedule)} · tolerância{" "}
                    {schedule.markToleranceMinutes} min
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${schedule.name}`}
                  onClick={() => setFormState({ mode: "edit", schedule })}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${schedule.name}`}
                  className="text-destructive"
                  onClick={() => setScheduleToDelete(schedule)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DetailsDialog>

      <WorkScheduleFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        schedule={formState.mode === "edit" ? formState.schedule : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <ConfirmDialog
        isOpen={scheduleToDelete !== null}
        onOpenChange={(isDialogOpen) =>
          !isDialogOpen && setScheduleToDelete(null)
        }
        title="Excluir jornada?"
        description={`Quem usa a jornada ${scheduleToDelete?.name ?? ""} fica sem horário definido e o espelho deixa de calcular atrasos e extras.`}
        confirmLabel="Excluir"
        isConfirming={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
