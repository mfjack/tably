"use client";

import { Package, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { IngredientFormDialog } from "./ingredient-form-dialog";
import { IngredientsTable } from "./ingredients-table";
import { StockEntryDialog } from "./stock-entry-dialog";

type IngredientFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; ingredient: Ingredient };

type IngredientsViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
};

export function IngredientsView({
  organizationId,
  title,
  description,
  canManage,
}: IngredientsViewProps) {
  const ingredientsQuery = useIngredientsQuery(organizationId);
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
          canManage && (
            <Button className="h-10" onClick={openCreateForm}>
              <Plus aria-hidden />
              Novo insumo
            </Button>
          )
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
      <DeleteIngredientDialog
        organizationId={organizationId}
        ingredient={ingredientToDelete}
        onClose={() => setIngredientToDelete(null)}
      />
    </>
  );
}
