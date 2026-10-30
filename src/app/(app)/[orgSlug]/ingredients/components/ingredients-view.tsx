"use client";

import {
  ChevronDown,
  CookingPot,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseDialog } from "@/features/ingredients/components/purchase-dialog";
import { ShoppingListDialog } from "@/features/ingredients/components/shopping-list-dialog";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import {
  getPurchasableItems,
  needsPurchase,
} from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { useProductsQuery } from "@/features/products/hooks/use-products-query";
import type { Product } from "@/features/products/types";
import { useHasStockLossesQuery } from "@/features/stock-losses/hooks/use-has-stock-losses-query";
import { useSuppliersQuery } from "@/features/suppliers/hooks/use-suppliers-query";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import {
  DEFAULT_INGREDIENTS_TAB,
  parseIngredientsTab,
} from "../ingredients-search-params";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { FoodLabelDialog } from "./food-label-dialog";
import { IngredientFormDialog } from "./ingredient-form-dialog";
import { IngredientsTable } from "./ingredients-table";
import { InvoiceImportDialog } from "./invoice-import-dialog";
import { PreparationFormDialog } from "./preparation-form-dialog";
import { ProductionDialog } from "./production-dialog";
import { StockLossFormDialog } from "./stock-loss-form-dialog";
import { StockLossesDialog } from "./stock-losses-dialog";

const EMPTY_INGREDIENTS: Ingredient[] = [];
const EMPTY_PRODUCTS: Product[] = [];

function splitIngredients(ingredients: readonly Ingredient[] | undefined) {
  const supplies: Ingredient[] = [];
  const preparations: Ingredient[] = [];
  for (const ingredient of ingredients ?? EMPTY_INGREDIENTS) {
    (ingredient.isPrepared ? preparations : supplies).push(ingredient);
  }
  return { supplies, preparations };
}

type PreparationFormState = {
  isOpen: boolean;
  preparation: Ingredient | null;
};

type PurchaseState = {
  isOpen: boolean;
  initialIngredient: Ingredient | null;
};

type IngredientsViewProps = {
  organizationId: OrganizationId;
  title: string;
  canManage: boolean;
  currentPersonName: string;
  business: OrderTicketBusiness;
};

export function IngredientsView({
  organizationId,
  title,
  canManage,
  currentPersonName,
  business,
}: IngredientsViewProps) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const suppliersQuery = useSuppliersQuery(organizationId);
  const productsQuery = useProductsQuery(organizationId);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);
  const [isLossesOpen, setIsLossesOpen] = useState(false);
  const hasStockLossesQuery = useHasStockLossesQuery(organizationId);
  const [ingredientForProduction, setIngredientForProduction] =
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
  const purchasableItems = useMemo(
    () =>
      getPurchasableItems(
        ingredientsQuery.data ?? EMPTY_INGREDIENTS,
        productsQuery.data ?? EMPTY_PRODUCTS,
      ),
    [ingredientsQuery.data, productsQuery.data],
  );
  const lowStockCount = useMemo(
    () => purchasableItems.filter(needsPurchase).length,
    [purchasableItems],
  );
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    isOpen: false,
    initialIngredient: null,
  });
  const [ingredientToEdit, setIngredientToEdit] = useState<Ingredient | null>(
    null,
  );
  const [ingredientToDelete, setIngredientToDelete] =
    useState<Ingredient | null>(null);

  const [tab, setTab] = useSearchParamState({
    key: "tab",
    defaultValue: DEFAULT_INGREDIENTS_TAB,
    parse: parseIngredientsTab,
  });
  const [preparationFormState, setPreparationFormState] =
    useState<PreparationFormState>({ isOpen: false, preparation: null });
  const { supplies, preparations } = useMemo(
    () => splitIngredients(ingredientsQuery.data),
    [ingredientsQuery.data],
  );
  const isPreparationsTab = tab === "preparations";

  const openCreateForm = useCallback(
    () => setPurchaseState({ isOpen: true, initialIngredient: null }),
    [],
  );
  const openPreparationForm = useCallback(
    () => setPreparationFormState({ isOpen: true, preparation: null }),
    [],
  );
  const openEditForm = useCallback((ingredient: Ingredient) => {
    if (ingredient.isPrepared) {
      setPreparationFormState({ isOpen: true, preparation: ingredient });
      return;
    }
    setIngredientToEdit(ingredient);
  }, []);

  function changeTab(value: string) {
    const nextTab = parseIngredientsTab(value);
    if (nextTab) setTab(nextTab);
  }

  const openStockEntry = useCallback(
    (ingredient: Ingredient) =>
      setPurchaseState({ isOpen: true, initialIngredient: ingredient }),
    [],
  );

  const tableProps = {
    isLoading: ingredientsQuery.isPending,
    errorMessage: ingredientsQuery.error?.message,
    canManage,
    onStockEntry: openStockEntry,
    onLoss: setIngredientForLoss,
    onPrintLabel: setIngredientForLabel,
    onProduce: setIngredientForProduction,
    onEdit: openEditForm,
    onDelete: setIngredientToDelete,
  };

  return (
    <>
      <PageHeader
        title={title}
        actions={
          isPreparationsTab ? (
            canManage && (
              <Button className="h-10" onClick={openPreparationForm}>
                <Plus aria-hidden />
                <span className="max-sm:sr-only">Novo preparo</span>
              </Button>
            )
          ) : (
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
              {hasStockLossesQuery.data && (
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => setIsLossesOpen(true)}
                >
                  <PackageMinus aria-hidden />
                  <span className="max-sm:sr-only">Perdas do mês</span>
                </Button>
              )}
              {canManage && (
                <Button className="h-10" onClick={openCreateForm}>
                  <Plus aria-hidden />
                  <span className="max-sm:sr-only">Novo insumo</span>
                </Button>
              )}
            </>
          )
        }
      />
      <PageContent>
        <Tabs
          value={tab}
          onValueChange={changeTab}
          className="min-h-0 flex-1 gap-5"
        >
          <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto group-data-horizontal/tabs:h-10">
            <TabsTrigger value="supplies" className="px-3">
              Insumos
            </TabsTrigger>
            <TabsTrigger value="preparations" className="px-3">
              Preparos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="supplies" className="flex min-h-0 flex-col">
            <IngredientsTable
              {...tableProps}
              ingredients={ingredientsQuery.data && supplies}
              emptyState={
                <ListEmptyState
                  icon={Package}
                  title="Nenhum insumo ainda"
                  description="Insumos são o que você compra para fazer os produtos, como leite, café em grãos ou copos. Com eles o Tably calcula o custo de cada produto."
                  createLabel="Cadastrar primeiro insumo"
                  canCreate={canManage}
                  onCreate={openCreateForm}
                />
              }
            />
          </TabsContent>
          <TabsContent value="preparations" className="flex min-h-0 flex-col">
            <IngredientsTable
              {...tableProps}
              ingredients={ingredientsQuery.data && preparations}
              emptyState={
                <ListEmptyState
                  icon={CookingPot}
                  title="Nenhum preparo ainda"
                  description="Preparos são o que vocês fazem na casa com os insumos, como caldas, cremes e massas. Cadastre a receita e use Produzir quando fizer."
                  createLabel="Cadastrar primeiro preparo"
                  canCreate={canManage}
                  onCreate={openPreparationForm}
                />
              }
            />
          </TabsContent>
        </Tabs>
      </PageContent>

      <PreparationFormDialog
        organizationId={organizationId}
        isOpen={preparationFormState.isOpen}
        preparation={preparationFormState.preparation}
        ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
        onClose={() =>
          setPreparationFormState((previousState) => ({
            ...previousState,
            isOpen: false,
          }))
        }
      />
      <PurchaseDialog
        organizationId={organizationId}
        isOpen={purchaseState.isOpen}
        ingredients={ingredientsQuery.data ?? EMPTY_INGREDIENTS}
        initialIngredient={purchaseState.initialIngredient}
        onClose={() =>
          setPurchaseState((previousState) => ({
            ...previousState,
            isOpen: false,
          }))
        }
      />
      <IngredientFormDialog
        organizationId={organizationId}
        ingredient={ingredientToEdit}
        onClose={() => setIngredientToEdit(null)}
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
      <ShoppingListDialog
        organizationId={organizationId}
        isOpen={isShoppingListOpen}
        canManage={canManage}
        items={purchasableItems}
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
