"use client";

import { toast } from "sonner";
import {
  ConfirmDialog,
  IRREVERSIBLE_ACTION_MESSAGE,
} from "@/components/dialog/confirm-dialog";
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteProductMutation } from "@/features/products/hooks/use-delete-product-mutation";
import type { Product } from "@/features/products/types";

type DeleteProductDialogProps = {
  organizationId: OrganizationId;
  product: Product | null;
  onClose: () => void;
};

export function DeleteProductDialog({
  organizationId,
  product,
  onClose,
}: DeleteProductDialogProps) {
  const deleteProductMutation = useDeleteProductMutation(organizationId);

  function handleConfirm() {
    if (!product) return;
    deleteProductMutation.mutate(product.id, {
      onSuccess: () => {
        toast.success("Produto excluído.");
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <ConfirmDialog
      isOpen={product !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={product ? `Excluir "${product.name}"?` : ""}
      description={`A ficha técnica também será excluída. Para só tirar do PDV, deixe o produto inativo. ${IRREVERSIBLE_ACTION_MESSAGE}`}
      confirmLabel="Excluir"
      isConfirming={deleteProductMutation.isPending}
      onConfirm={handleConfirm}
    />
  );
}
