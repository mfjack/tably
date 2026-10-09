"use client";

import { ShoppingListDialog } from "@/features/ingredients/components/shopping-list-dialog";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useSuppliersQuery } from "@/features/suppliers/hooks/use-suppliers-query";

type HomeShoppingListProps = {
  organizationId: OrganizationId;
  canManage: boolean;
  business: OrderTicketBusiness;
  onClose: () => void;
};

export function HomeShoppingList({
  organizationId,
  canManage,
  business,
  onClose,
}: HomeShoppingListProps) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const suppliersQuery = useSuppliersQuery(organizationId);

  return (
    <ShoppingListDialog
      organizationId={organizationId}
      isOpen={ingredientsQuery.isSuccess && suppliersQuery.isSuccess}
      canManage={canManage}
      ingredients={ingredientsQuery.data ?? []}
      suppliers={suppliersQuery.data ?? []}
      business={business}
      onClose={onClose}
    />
  );
}
