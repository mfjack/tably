"use client";

import { useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { ToggleChip } from "@/components/toggle-chip";
import { Button } from "@/components/ui/button";
import { getAddonsTotal } from "@/features/product-addons/item-addons";
import type { ProductAddonId } from "@/features/product-addons/types";
import type { Product } from "@/features/products/types";
import { formatCurrency } from "@/lib/format";

type AddonPickerDialogProps = {
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product, addonIds: ProductAddonId[]) => void;
};

type AddonPickerContentProps = {
  product: Product;
  onClose: () => void;
  onConfirm: (product: Product, addonIds: ProductAddonId[]) => void;
};

function AddonPickerContent({
  product,
  onClose,
  onConfirm,
}: AddonPickerContentProps) {
  const [selectedIds, setSelectedIds] = useState<ProductAddonId[]>([]);
  const availableAddons = product.addons.filter((addon) => addon.isActive);
  const selectedAddons = availableAddons.filter((addon) =>
    selectedIds.includes(addon.id),
  );
  const total = product.price + getAddonsTotal(selectedAddons);

  function toggleAddon(addonId: ProductAddonId) {
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
      title={product.name}
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
            onClick={() => onConfirm(product, selectedIds)}
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
        <div className="flex flex-wrap gap-2">
          {availableAddons.map((addon) => (
            <ToggleChip
              key={addon.id}
              label={`${addon.name} · + ${formatCurrency(addon.price)}`}
              isSelected={selectedIds.includes(addon.id)}
              onToggle={() => toggleAddon(addon.id)}
            />
          ))}
        </div>
      </div>
    </DetailsDialog>
  );
}

export function AddonPickerDialog({
  product,
  onClose,
  onConfirm,
}: AddonPickerDialogProps) {
  if (!product) return null;
  return (
    <AddonPickerContent
      key={product.id}
      product={product}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
