"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteProductAddonMutation } from "@/features/product-addons/hooks/use-delete-product-addon-mutation";
import { useProductAddonsQuery } from "@/features/product-addons/hooks/use-product-addons-query";
import type { ProductAddon } from "@/features/product-addons/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductAddonFormDialog } from "./product-addon-form-dialog";

type AddonFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; addon: ProductAddon };

type ProductAddonsDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredients: readonly Ingredient[];
  ingredientsById: ReadonlyMap<string, Ingredient>;
  onClose: () => void;
};

function describeStockUsage(
  addon: ProductAddon,
  ingredientsById: ReadonlyMap<string, Ingredient>,
): string {
  const ingredient = addon.ingredientId
    ? ingredientsById.get(addon.ingredientId)
    : undefined;
  if (!ingredient || addon.ingredientQuantity === null) {
    return "Não baixa do estoque";
  }
  return `Usa ${formatQuantity(addon.ingredientQuantity)} ${getUnitSymbol(ingredient.unit)} de ${ingredient.name}`;
}

export function ProductAddonsDialog({
  organizationId,
  isOpen,
  ingredients,
  ingredientsById,
  onClose,
}: ProductAddonsDialogProps) {
  const addonsQuery = useProductAddonsQuery(organizationId);
  const deleteMutation = useDeleteProductAddonMutation(organizationId);
  const [formState, setFormState] = useState<AddonFormState>({
    mode: "closed",
  });

  if (isOpen && formState.mode !== "closed") {
    return (
      <ProductAddonFormDialog
        organizationId={organizationId}
        addon={formState.mode === "edit" ? formState.addon : undefined}
        ingredients={ingredients}
        onClose={() => setFormState({ mode: "closed" })}
      />
    );
  }

  const addons = addonsQuery.data ?? [];

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Adicionais"
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
            onClick={() => setFormState({ mode: "create" })}
          >
            <Plus aria-hidden />
            Novo adicional
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Extras cobrados à parte, como granola ou leite em pó. Cadastre aqui e
          escolha no produto quais ele aceita.
        </p>
        {addonsQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner aria-label="Carregando adicionais" />
          </div>
        ) : addons.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
            Nenhum adicional cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {addons.map((addon) => (
              <li
                key={addon.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  !addon.isActive && "opacity-60",
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <span className="truncate">{addon.name}</span>
                    {!addon.isActive && (
                      <Badge variant="secondary">Indisponível</Badge>
                    )}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {describeStockUsage(addon, ingredientsById)}
                  </span>
                </div>
                <span className="font-medium text-sm tabular-nums">
                  {formatCurrency(addon.price)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${addon.name}`}
                  onClick={() => setFormState({ mode: "edit", addon })}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${addon.name}`}
                  className="text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(addon.id, {
                      onSuccess: () => toast.success("Adicional excluído."),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailsDialog>
  );
}
