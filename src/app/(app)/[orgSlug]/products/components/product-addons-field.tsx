"use client";

import { type Control, useController } from "react-hook-form";
import { ToggleChip } from "@/components/toggle-chip";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useProductAddonsQuery } from "@/features/product-addons/hooks/use-product-addons-query";
import type { ProductFormInput } from "@/features/products/schemas";
import { formatCurrency } from "@/lib/format";

type ProductAddonsFieldProps = {
  organizationId: OrganizationId;
  control: Control<ProductFormInput>;
};

export function ProductAddonsField({
  organizationId,
  control,
}: ProductAddonsFieldProps) {
  const addonsQuery = useProductAddonsQuery(organizationId);
  const { field } = useController({ control, name: "addonIds" });
  const selectedIds = field.value ?? [];
  const addons = (addonsQuery.data ?? []).filter(
    (addon) => addon.isActive || selectedIds.includes(addon.id),
  );

  function toggleAddon(addonId: string) {
    field.onChange(
      selectedIds.includes(addonId)
        ? selectedIds.filter((selectedId) => selectedId !== addonId)
        : [...selectedIds, addonId],
    );
  }

  return (
    <FieldSet>
      <FieldLegend>Adicionais</FieldLegend>
      <FieldDescription>
        {addons.length > 0
          ? "Marque os extras que o cliente pode pedir com esse produto."
          : "Nenhum adicional cadastrado. Use o botão Adicionais, no topo da página de produtos."}
      </FieldDescription>
      {addons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {addons.map((addon) => (
            <ToggleChip
              key={addon.id}
              label={`${addon.name} · ${formatCurrency(addon.price)}`}
              isSelected={selectedIds.includes(addon.id)}
              onToggle={() => toggleAddon(addon.id)}
            />
          ))}
        </div>
      )}
    </FieldSet>
  );
}
