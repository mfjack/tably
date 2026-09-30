"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteFinancialEntryMutation } from "@/features/finance/hooks/use-delete-financial-entry-mutation";
import {
  ENTRY_DELETE_SCOPES,
  type EntryDeleteScope,
} from "@/features/finance/schemas";
import type { FinancialEntry } from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";

type DeleteEntryDialogProps = {
  organizationId: OrganizationId;
  entry: FinancialEntry | null;
  onClose: () => void;
};

function getScopeOptions(entry: FinancialEntry) {
  if (entry.recurrenceId) {
    return [
      { value: "single", label: "Só este vencimento" },
      {
        value: "following",
        label: "Este e os próximos (encerra a repetição)",
      },
    ] as const;
  }
  if (entry.installmentGroupId) {
    return [
      { value: "single", label: "Só esta parcela" },
      { value: "installments", label: "Todas as parcelas em aberto" },
    ] as const;
  }
  return [];
}

export function DeleteEntryDialog({
  organizationId,
  entry,
  onClose,
}: DeleteEntryDialogProps) {
  const deleteMutation = useDeleteFinancialEntryMutation(organizationId);
  const [scope, setScope] = useState<EntryDeleteScope>("single");
  const radioId = useId();
  const scopeOptions = entry ? getScopeOptions(entry) : [];

  useEffect(() => {
    if (entry) setScope("single");
  }, [entry]);

  function confirmDelete() {
    if (!entry) return;
    deleteMutation.mutate(
      { entryId: entry.id, scope },
      {
        onSuccess: () => {
          toast.success("Lançamento excluído.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <DetailsDialog
      isOpen={entry !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Excluir lançamento?"
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
            Cancelar
          </DialogClose>
          <Button
            variant="destructive"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={confirmDelete}
          >
            {deleteMutation.isPending && <Spinner aria-hidden />}
            Excluir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {entry?.description}
          </span>{" "}
          será excluído, junto com os anexos. Lançamentos já pagos de outros
          meses continuam no histórico.
        </p>
        {scopeOptions.length > 0 && (
          <RadioGroup
            value={scope}
            onValueChange={(value) => {
              const nextScope = ENTRY_DELETE_SCOPES.find(
                (deleteScope) => deleteScope === value,
              );
              if (nextScope) setScope(nextScope);
            }}
            className="gap-3 rounded-lg border p-4"
          >
            {scopeOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={option.value}
                  id={`${radioId}-${option.value}`}
                />
                <Label htmlFor={`${radioId}-${option.value}`}>
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>
    </DetailsDialog>
  );
}
