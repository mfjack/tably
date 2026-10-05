"use client";

import { FileUp, Package, Plus, ShoppingCart } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import { isRunningLow } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useSuppliersQuery } from "@/features/suppliers/hooks/use-suppliers-query";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { IngredientFormDialog } from "./ingredient-form-dialog";
import { IngredientsTable } from "./ingredients-table";
import { InvoiceImportDialog } from "./invoice-import-dialog";
import { ShoppingListDialog } from "./shopping-list-dialog";
import { StockEntryDialog } from "./stock-entry-dialog";

const EMPTY_INGREDIENTS: Ingredient[] = [];

type IngredientFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; ingredient: Ingredient };

type IngredientsViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
  business: OrderTicketBusiness;
};

export function IngredientsView({
  organizationId,
  title,
  description,
  canManage,
  business,
}: IngredientsViewProps) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const suppliersQuery = useSuppliersQuery(organizationId);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);
  const lowStockCount = useMemo(
    () => (ingredientsQuery.data ?? []).filter(isRunningLow).length,
    [ingredientsQuery.data],
  );
  const [formState, setFormState] = useState<IngredientFormState>({
    mode: "closed",
  });
  const [ingredientForStockEntry, setIngredientForStockEntry] =
    useState<Ingredient | null>(null);
  const [ingredientToDelete, setIngredientToDelete] =
    useState<Ingredient | null>(null);

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((ingredient: Ingredient) => {
    setFormState({ mode: "edit", ingredient });
  }, []);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10"
              disabled={!ingredientsQuery.data}
              onClick={() => setIsShoppingListOpen(true)}
            >
              <ShoppingCart aria-hidden />
              <span className="max-sm:sr-only">Lista de compras</span>
              {lowStockCount > 0 && (
                <span className="rounded-full bg-destructive px-1.5 font-semibold text-white text-xs tabular-nums">
                  {lowStockCount}
                </span>
              )}
            </Button>
            {canManage && (
              <Button
                variant="outline"
                className="h-10"
                onClick={() => setIsInvoiceImportOpen(true)}
              >
                <FileUp aria-hidden />
                <span className="max-sm:sr-only">Importar nota</span>
              </Button>
            )}
            {canManage && (
              <Button className="h-10" onClick={openCreateForm}>
                <Plus aria-hidden />
                <span className="max-sm:sr-only">Novo insumo</span>
              </Button>
            )}
          </>
        }
      />
      <PageContent>
        <IngredientsTable
          ingredients={ingredientsQuery.data}
          isLoading={ingredientsQuery.isPending}
          errorMessage={ingredientsQuery.error?.message}
          canManage={canManage}
          emptyState={
            <ListEmptyState
              icon={Package}
              title="Nenhum insumo ainda"
              description="Insumos são as matérias-primas dos seus produtos, como leite, café em grãos ou copos. Com eles o Tably calcula o custo de cada produto."
              createLabel="Cadastrar primeiro insumo"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onStockEntry={setIngredientForStockEntry}
          onEdit={openEditForm}
          onDelete={setIngredientToDelete}
        />
      </PageContent>

      <IngredientFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        ingredient={
          formState.mode === "edit" ? formState.ingredient : undefined
        }
        onClose={() => setFormState({ mode: "closed" })}
      />
      <StockEntryDialog
        organizationId={organizationId}
        ingredient={ingredientForStockEntry}
        onClose={() => setIngredientForStockEntry(null)}
      />
      <ShoppingListDialog
        isOpen={isShoppingListOpen}
        ingredients={ingredientsQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        business={business}
        onClose={() => setIsShoppingListOpen(false)}
      />
      <DeleteIngredientDialog
        organizationId={organizationId}
        ingredient={ingredientToDelete}
        onClose={() => setIngredientToDelete(null)}
      />
      <InvoiceImportDialog
        organizationId={organizationId}
        isOpen={isInvoiceImportOpen}
        ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
        onClose={() => setIsInvoiceImportOpen(false)}
      />
    </>
  );
}
