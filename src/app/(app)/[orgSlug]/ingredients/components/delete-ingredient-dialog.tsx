"use client";

import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { useDeleteIngredientMutation } from "@/features/ingredients/hooks/use-delete-ingredient-mutation";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";

type DeleteIngredientDialogProps = {
  organizationId: OrganizationId;
  ingredient: Ingredient | null;
  onClose: () => void;
};

function getDeleteDescription(ingredient: Ingredient) {
  if (ingredient.recipeCount === 0) {
    return `O histórico de entradas também será excluído. ${IRREVERSIBLE_ACTION_MESSAGE}`;
  }

  const productsLabel =
    ingredient.recipeCount === 1
      ? "1 produto"
      : `${ingredient.recipeCount} produtos`;

  return `Esse insumo está na ficha técnica de ${productsLabel}. Remova-o dos produtos antes de excluir.`;
}

export function DeleteIngredientDialog({
  organizationId,
  ingredient,
  onClose,
}: DeleteIngredientDialogProps) {
  const deleteIngredientMutation = useDeleteIngredientMutation(organizationId);

  function handleConfirm() {
    if (!ingredient) return;
    deleteIngredientMutation.mutate(ingredient.id, {
      onSuccess: () => {
        toast.success("Insumo excluído.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <ConfirmDialog
      isOpen={ingredient !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={ingredient ? `Excluir "${ingredient.name}"?` : ""}
      description={ingredient ? getDeleteDescription(ingredient) : ""}
      confirmLabel="Excluir"
      isConfirming={deleteIngredientMutation.isPending}
      onConfirm={handleConfirm}
    />
  );
}
