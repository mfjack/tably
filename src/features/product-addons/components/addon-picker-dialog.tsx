"use client";

import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { ToggleChip } from "@/components/toggle-chip";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatAddonLabel, getAddonsTotal } from "../item-addons";

export type AddonOption = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

type AddonPickerDialogProps = {
  title: string;
  basePrice: number;
  addons: readonly AddonOption[];
  onClose: () => void;
  onConfirm: (addonIds: string[]) => void;
};

export function AddonPickerDialog({
  title,
  basePrice,
  addons,
  onClose,
  onConfirm,
}: AddonPickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedAddons = addons.filter((addon) =>
    selectedIds.includes(addon.id),
  );
  const total = basePrice + getAddonsTotal(selectedAddons);

  function toggleAddon(addonId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(addonId)
        ? currentIds.filter((currentId) => currentId !== addonId)
        : [...currentIds, addonId],
    );
  }

  return (
    <DetailsDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={title}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={() => onConfirm(selectedIds)}
          >
            Adicionar · {formatCurrency(total)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Escolha os adicionais ou toque em Adicionar para levar sem nenhum.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {addons.map((addon) => (
            <ToggleChip
              key={addon.id}
              label={
                addon.isAvailable
                  ? formatAddonLabel(addon)
                  : `${addon.name} · Esgotado`
              }
              isSelected={selectedIds.includes(addon.id)}
              isDisabled={!addon.isAvailable}
              onToggle={() => toggleAddon(addon.id)}
              className="w-full justify-center"
            />
          ))}
        </div>
      </div>
    </DetailsDialog>
  );
}
