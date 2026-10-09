"use client";

import { Check, Thermometer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrganizationId } from "@/features/organizations/types";
import { useAddTaskListsFromTemplatesMutation } from "@/features/tasks/hooks/use-add-task-lists-from-templates-mutation";
import {
  PROCESS_SEGMENT_LABELS,
  PROCESS_SEGMENTS,
  PROCESS_TEMPLATES,
  type ProcessSegment,
  type ProcessTemplate,
} from "@/features/tasks/process-templates";
import { TASK_PERIOD_LABELS } from "@/features/tasks/task-periods";
import { cn } from "@/lib/utils";

type ProcessTemplatesDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  existingListNames: readonly string[];
  onClose: () => void;
};

function isProcessSegment(value: string): value is ProcessSegment {
  return PROCESS_SEGMENTS.some((segment) => segment === value);
}

function countTemperatureTasks(template: ProcessTemplate): number {
  return template.tasks.filter((task) => task.kind === "temperature").length;
}

export function ProcessTemplatesDialog({
  organizationId,
  isOpen,
  existingListNames,
  onClose,
}: ProcessTemplatesDialogProps) {
  const addMutation = useAddTaskListsFromTemplatesMutation(organizationId);
  const [segment, setSegment] = useState<ProcessSegment>("all");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const templates = PROCESS_TEMPLATES.filter(
    (template) => template.segment === segment,
  );

  function toggleTemplate(templateId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(templateId)
        ? currentIds.filter((id) => id !== templateId)
        : [...currentIds, templateId],
    );
  }

  function closeDialog() {
    setSelectedIds([]);
    onClose();
  }

  function addSelected() {
    addMutation.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(
          selectedIds.length === 1
            ? "Processo adicionado."
            : `${selectedIds.length} processos adicionados.`,
        );
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && closeDialog()}
      title="Modelos de processos"
      size="large"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={closeDialog}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={selectedIds.length === 0}
            isLoading={addMutation.isPending}
            onClick={addSelected}
          >
            {selectedIds.length > 1
              ? `Adicionar ${selectedIds.length} processos`
              : "Adicionar processo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Checklists prontos, com base nas boas práticas da Anvisa para serviços
          de alimentação. Depois de adicionar, dá para editar, tirar ou incluir
          itens.
        </p>
        <Tabs
          value={segment}
          onValueChange={(value: string) => {
            if (isProcessSegment(value)) setSegment(value);
          }}
        >
          <TabsList className="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
            {PROCESS_SEGMENTS.map((option) => (
              <TabsTrigger key={option} value={option} className="px-3">
                {PROCESS_SEGMENT_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ul className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => {
            const isSelected = selectedIds.includes(template.id);
            const isAdded = existingListNames.includes(template.name);
            const temperatureCount = countTemperatureTasks(template);
            return (
              <li key={template.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTemplate(template.id)}
                  className={cn(
                    "flex h-full w-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50",
                    isSelected && "border-primary bg-primary/5",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm">
                      {template.name}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isSelected && (
                        <Check className="size-3.5" strokeWidth={3} />
                      )}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {template.description}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary">
                      {TASK_PERIOD_LABELS[template.period]}
                    </Badge>
                    <Badge variant="outline">
                      {template.tasks.length} itens
                    </Badge>
                    {temperatureCount > 0 && (
                      <Badge variant="outline">
                        <Thermometer aria-hidden />
                        {temperatureCount}
                      </Badge>
                    )}
                    {isAdded && (
                      <Badge variant="outline" className="text-primary">
                        Já adicionado
                      </Badge>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </DetailsDialog>
  );
}
