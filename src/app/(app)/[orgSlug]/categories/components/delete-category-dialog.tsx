"use client";

import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import { useDeleteCategoryMutation } from "@/features/categories/hooks/use-delete-category-mutation";
import type { Category } from "@/features/categories/types";
import type { OrganizationId } from "@/features/organizations/types";

type DeleteCategoryDialogProps = {
  organizationId: OrganizationId;
  category: Category | null;
  onClose: () => void;
};

function getDeleteDescription(category: Category) {
  if (category.productCount === 0) return IRREVERSIBLE_ACTION_MESSAGE;

  const affectedProducts =
    category.productCount === 1
      ? "1 produto vai ficar sem categoria."
      : `${category.productCount} produtos vão ficar sem categoria.`;

  return `${affectedProducts} ${IRREVERSIBLE_ACTION_MESSAGE}`;
}

export function DeleteCategoryDialog({
  organizationId,
  category,
  onClose,
}: DeleteCategoryDialogProps) {
  const deleteCategoryMutation = useDeleteCategoryMutation(organizationId);

  function handleConfirm() {
    if (!category) return;
    deleteCategoryMutation.mutate(category.id, {
      onSuccess: () => {
        toast.success("Categoria excluída.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <ConfirmDialog
      isOpen={category !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={category ? `Excluir "${category.name}"?` : ""}
      description={category ? getDeleteDescription(category) : ""}
      confirmLabel="Excluir"
      isConfirming={deleteCategoryMutation.isPending}
      onConfirm={handleConfirm}
    />
  );
}
