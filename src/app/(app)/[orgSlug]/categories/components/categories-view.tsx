"use client";

import { LayoutGrid, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import type { Category } from "@/features/categories/types";
import type { OrganizationId } from "@/features/organizations/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { CategoriesTable } from "./categories-table";
import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

type CategoryFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; category: Category };

type CategoriesViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
};

export function CategoriesView({
  organizationId,
  title,
  description,
  canManage,
}: CategoriesViewProps) {
  const categoriesQuery = useCategoriesQuery(organizationId);
  const [formState, setFormState] = useState<CategoryFormState>({
    mode: "closed",
  });
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((category: Category) => {
    setFormState({ mode: "edit", category });
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
              Nova categoria
            </Button>
          )
        }
      />
      <PageContent>
        <CategoriesTable
          categories={categoriesQuery.data}
          isLoading={categoriesQuery.isPending}
          errorMessage={categoriesQuery.error?.message}
          canManage={canManage}
          emptyState={
            <ListEmptyState
              icon={LayoutGrid}
              title="Nenhuma categoria ainda"
              description="As categorias organizam os produtos no PDV, como Cafés, Salgados ou Bebidas."
              createLabel="Criar primeira categoria"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onEdit={openEditForm}
          onDelete={setCategoryToDelete}
        />
      </PageContent>

      <CategoryFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        category={formState.mode === "edit" ? formState.category : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <DeleteCategoryDialog
        organizationId={organizationId}
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
      />
    </>
  );
}
