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
  if (ingredient.isPrepared) {
    return ingredient.isReferenced
      ? `Ele sai das fichas técnicas, das receitas e dos adicionais em que é usado, e o custo desses produtos muda. ${IRREVERSIBLE_ACTION_MESSAGE}`
      : `A receita e o histórico também serão excluídos. ${IRREVERSIBLE_ACTION_MESSAGE}`;
  }
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
        toast.success(
          ingredient.isPrepared ? "Preparo excluído." : "Insumo excluído.",
        );
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
