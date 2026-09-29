"use client";

import { Plus, Tag } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIngredientsMap } from "@/features/ingredients/hooks/use-ingredients-map";
import type { OrganizationId } from "@/features/organizations/types";
import { useProductsQuery } from "@/features/products/hooks/use-products-query";
import type { Product } from "@/features/products/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductsTable } from "./products-table";

type ProductFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; product: Product };

type ProductsViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
};

export function ProductsView({
  organizationId,
  title,
  description,
  canManage,
}: ProductsViewProps) {
  const productsQuery = useProductsQuery(organizationId);
  const { ingredientsById, isPending: isLoadingIngredients } =
    useIngredientsMap(organizationId);
  const [formState, setFormState] = useState<ProductFormState>({
    mode: "closed",
  });
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((product: Product) => {
    setFormState({ mode: "edit", product });
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
              Novo produto
            </Button>
          )
        }
      />
      <PageContent>
        <ProductsTable
          products={productsQuery.data}
          ingredientsById={ingredientsById}
          isLoading={productsQuery.isPending || isLoadingIngredients}
          errorMessage={productsQuery.error?.message}
          canManage={canManage}
          emptyState={
            <ListEmptyState
              icon={Tag}
              title="Nenhum produto ainda"
              description="Cadastre o que você vende, com preço e ficha técnica. O Tably calcula o custo e a margem de cada produto."
              createLabel="Cadastrar primeiro produto"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onEdit={openEditForm}
          onDelete={setProductToDelete}
        />
      </PageContent>

      <ProductFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        product={formState.mode === "edit" ? formState.product : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <DeleteProductDialog
        organizationId={organizationId}
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
      />
    </>
  );
}
