"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDeleteFinancialEntryMutation } from "@/features/finance/hooks/use-delete-financial-entry-mutation";
import { useUndoStockPurchaseMutation } from "@/features/finance/hooks/use-undo-stock-purchase-mutation";
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
      {
        value: "all",
        label: "Excluir a conta (todos os meses em aberto)",
      },
      { value: "single", label: "Só este mês" },
    ] as const;
  }
  if (entry.installmentGroupId) {
    return [
      { value: "installments", label: "Excluir todas as parcelas em aberto" },
      { value: "single", label: "Só esta parcela" },
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
  const undoPurchaseMutation = useUndoStockPurchaseMutation(organizationId);
  const [scope, setScope] = useState<EntryDeleteScope>("single");
  const [isUndoingPurchase, setIsUndoingPurchase] = useState(true);
  const purchasedItemCount = entry?.purchasedItemCount ?? 0;
  const willUndoPurchase = purchasedItemCount > 0 && isUndoingPurchase;
  const defaultScope: EntryDeleteScope = entry?.recurrenceId
    ? "all"
    : entry?.installmentGroupId
      ? "installments"
      : "single";
  const radioId = useId();
  const scopeOptions = entry ? getScopeOptions(entry) : [];

  useEffect(() => {
    if (!entry) return;
    setScope(defaultScope);
    setIsUndoingPurchase(true);
  }, [entry, defaultScope]);

  function confirmDelete() {
    if (!entry) return;
    if (willUndoPurchase) {
      undoPurchaseMutation.mutate(entry.id, {
        onSuccess: () => {
          toast.success("Compra desfeita. Os itens saíram do estoque.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      });
      return;
    }
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
      title={willUndoPurchase ? "Desfazer compra?" : "Excluir lançamento?"}
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
            isLoading={
              deleteMutation.isPending || undoPurchaseMutation.isPending
            }
            onClick={confirmDelete}
          >
            {willUndoPurchase ? "Desfazer compra" : "Excluir"}
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
        {purchasedItemCount > 0 && (
          <RadioGroup
            value={isUndoingPurchase ? "undo" : "entry"}
            onValueChange={(value) => setIsUndoingPurchase(value === "undo")}
            className="gap-3 rounded-lg border p-4"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem
                value="undo"
                id={`${radioId}-undo`}
                className="mt-0.5"
              />
              <Label
                htmlFor={`${radioId}-undo`}
                className="flex flex-col items-start gap-0.5"
              >
                Desfazer a compra
                <span className="font-normal text-muted-foreground text-xs">
                  {purchasedItemCount > 1
                    ? `Os ${purchasedItemCount} itens saem do estoque`
                    : "O item sai do estoque"}{" "}
                  e o custo volta ao de antes. Insumos cadastrados nessa compra
                  e ainda não usados são apagados.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem
                value="entry"
                id={`${radioId}-entry`}
                className="mt-0.5"
              />
              <Label
                htmlFor={`${radioId}-entry`}
                className="flex flex-col items-start gap-0.5"
              >
                Excluir só a conta
                <span className="font-normal text-muted-foreground text-xs">
                  O estoque fica como está.
                </span>
              </Label>
            </div>
          </RadioGroup>
        )}
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
