import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrganizationId } from "@/features/organizations/types";
import { useReorderProductsMutation } from "@/features/products/hooks/use-reorder-products-mutation";
import type { ProductId } from "@/features/products/types";
import type { PosProduct } from "./use-pos-catalog";

export function useProductOrganizer(
  organizationId: OrganizationId,
  products: readonly PosProduct[],
) {
  const [draftProductIds, setDraftProductIds] = useState<ProductId[] | null>(
    null,
  );
  const reorderProductsMutation = useReorderProductsMutation(organizationId);

  const organizedProducts = useMemo(() => {
    if (!draftProductIds) return products;
    const draftPositions = new Map(
      draftProductIds.map((productId, index) => [productId, index]),
    );
    return [...products].sort(
      (first, second) =>
        (draftPositions.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (draftPositions.get(second.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [draftProductIds, products]);

  const startOrganizing = useCallback(() => {
    setDraftProductIds(products.map((product) => product.id));
  }, [products]);

  function cancelOrganizing() {
    setDraftProductIds(null);
  }

  function moveProduct(activeProductId: ProductId, overProductId: ProductId) {
    setDraftProductIds((currentProductIds) => {
      if (!currentProductIds) return currentProductIds;
      return arrayMove(
        currentProductIds,
        currentProductIds.indexOf(activeProductId),
        currentProductIds.indexOf(overProductId),
      );
    });
  }

  function saveOrganization() {
    if (!draftProductIds) return;
    reorderProductsMutation.mutate(draftProductIds, {
      onSuccess: () => {
        setDraftProductIds(null);
        toast.success("Ordem dos produtos salva.");
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return {
    isOrganizing: draftProductIds !== null,
    isSaving: reorderProductsMutation.isPending,
    organizedProducts,
    startOrganizing,
    cancelOrganizing,
    moveProduct,
    saveOrganization,
  };
}
