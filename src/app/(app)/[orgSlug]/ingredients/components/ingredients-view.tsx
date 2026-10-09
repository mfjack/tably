"use client";

import {
  ChevronDown,
  ClipboardCheck,
  FileUp,
  Package,
  PackageMinus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingListDialog } from "@/features/ingredients/components/shopping-list-dialog";
import { StockEntryDialog } from "@/features/ingredients/components/stock-entry-dialog";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import { needsPurchase } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useSuppliersQuery } from "@/features/suppliers/hooks/use-suppliers-query";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { FoodLabelDialog } from "./food-label-dialog";
import { IngredientFormDialog } from "./ingredient-form-dialog";
import { IngredientsTable } from "./ingredients-table";
import { InvoiceImportDialog } from "./invoice-import-dialog";
import { PreparedRecipeDialog } from "./prepared-recipe-dialog";
import { ProductionDialog } from "./production-dialog";
import { StockCountDialog } from "./stock-count-dialog";
import { StockLossFormDialog } from "./stock-loss-form-dialog";
import { StockLossesDialog } from "./stock-losses-dialog";

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
  currentPersonName: string;
  business: OrderTicketBusiness;
};

export function IngredientsView({
  organizationId,
  title,
  description,
  canManage,
  currentPersonName,
  business,
}: IngredientsViewProps) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const suppliersQuery = useSuppliersQuery(organizationId);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);
  const [isStockCountOpen, setIsStockCountOpen] = useState(false);
  const [isLossesOpen, setIsLossesOpen] = useState(false);
  const [ingredientForProduction, setIngredientForProduction] =
    useState<Ingredient | null>(null);
  const [ingredientForRecipe, setIngredientForRecipe] =
    useState<Ingredient | null>(null);
  const ingredientsById = useMemo(
    () =>
      new Map(
        (ingredientsQuery.data ?? []).map((ingredient) => [
          ingredient.id,
          ingredient,
        ]),
      ),
    [ingredientsQuery.data],
  );
  const [ingredientForLoss, setIngredientForLoss] = useState<Ingredient | null>(
    null,
  );
  const [ingredientForLabel, setIngredientForLabel] =
    useState<Ingredient | null>(null);
  const lowStockCount = useMemo(
    () => (ingredientsQuery.data ?? []).filter(needsPurchase).length,
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={!ingredientsQuery.data}
                  />
                }
              >
                <ShoppingCart aria-hidden />
                <span className="max-sm:sr-only">Compras</span>
                {lowStockCount > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 font-semibold text-white text-xs tabular-nums">
                    {lowStockCount}
                  </span>
                )}
                <ChevronDown aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem onClick={() => setIsShoppingListOpen(true)}>
                  <ShoppingCart aria-hidden />
                  Lista de compras e pedidos
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem
                    onClick={() => setIsInvoiceImportOpen(true)}
                  >
                    <FileUp aria-hidden />
                    Importar nota fiscal (XML)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={!ingredientsQuery.data?.length}
                  />
                }
              >
                <Package aria-hidden />
                <span className="max-sm:sr-only">Estoque</span>
                <ChevronDown aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {canManage && (
                  <DropdownMenuItem onClick={() => setIsStockCountOpen(true)}>
                    <ClipboardCheck aria-hidden />
                    Contar estoque
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsLossesOpen(true)}>
                  <PackageMinus aria-hidden />
                  Perdas do mês
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          onLoss={setIngredientForLoss}
          onPrintLabel={setIngredientForLabel}
          onProduce={setIngredientForProduction}
          onEditRecipe={setIngredientForRecipe}
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
      {ingredientForLabel && (
        <FoodLabelDialog
          organizationId={organizationId}
          ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
          initialIngredient={ingredientForLabel}
          defaultResponsibleName={currentPersonName}
          onClose={() => setIngredientForLabel(null)}
        />
      )}
      {ingredientForProduction && (
        <ProductionDialog
          organizationId={organizationId}
          ingredient={ingredientForProduction}
          ingredientsById={ingredientsById}
          onPrintLabel={(ingredient) => {
            setIngredientForProduction(null);
            setIngredientForLabel(ingredient);
          }}
          onClose={() => setIngredientForProduction(null)}
        />
      )}
      {ingredientForRecipe && (
        <PreparedRecipeDialog
          organizationId={organizationId}
          ingredient={ingredientForRecipe}
          ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
          onClose={() => setIngredientForRecipe(null)}
        />
      )}
      <StockLossesDialog
        organizationId={organizationId}
        isOpen={isLossesOpen}
        ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
        onClose={() => setIsLossesOpen(false)}
      />
      {ingredientForLoss && (
        <StockLossFormDialog
          organizationId={organizationId}
          ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
          initialIngredient={ingredientForLoss}
          onClose={() => setIngredientForLoss(null)}
        />
      )}
      <StockCountDialog
        organizationId={organizationId}
        isOpen={isStockCountOpen}
        ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
        onClose={() => setIsStockCountOpen(false)}
      />
      <StockEntryDialog
        organizationId={organizationId}
        ingredient={ingredientForStockEntry}
        onClose={() => setIngredientForStockEntry(null)}
      />
      <ShoppingListDialog
        organizationId={organizationId}
        isOpen={isShoppingListOpen}
        canManage={canManage}
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
