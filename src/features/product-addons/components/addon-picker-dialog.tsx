"use client";

import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  formatAddonLabel,
  getAddonsTotal,
  resolveSelectedAddons,
} from "../item-addons";
import { AddonQuantityChip } from "./addon-quantity-chip";

const MAX_ADDON_QUANTITY = 5;

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
  const selectedAddons = resolveSelectedAddons(selectedIds, addons);
  const total = basePrice + getAddonsTotal(selectedAddons);

  function countSelected(addonId: string) {
    return selectedIds.filter((selectedId) => selectedId === addonId).length;
  }

  function addAddon(addonId: string) {
    setSelectedIds((currentIds) => [...currentIds, addonId]);
  }

  function removeAddon(addonId: string) {
    setSelectedIds((currentIds) => {
      const index = currentIds.lastIndexOf(addonId);
      return index === -1
        ? currentIds
        : [...currentIds.slice(0, index), ...currentIds.slice(index + 1)];
    });
  }

  return (
    <DetailsDialog
      size="large"
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
        <p className="text-muted-foreground text-sm">Quer algo adicional?</p>
        <div className="grid grid-cols-2 gap-2">
          {addons.map((addon) => (
            <AddonQuantityChip
              key={addon.id}
              label={
                addon.isAvailable
                  ? formatAddonLabel(addon)
                  : `${addon.name} (esgotado)`
              }
              addonName={addon.name}
              quantity={countSelected(addon.id)}
              maxQuantity={MAX_ADDON_QUANTITY}
              isDisabled={!addon.isAvailable}
              onIncrement={() => addAddon(addon.id)}
              onDecrement={() => removeAddon(addon.id)}
            />
          ))}
        </div>
      </div>
    </DetailsDialog>
  );
}
