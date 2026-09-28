"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import { useIngredientsQuery } from "@/features/ingredients/hooks/use-ingredients-query";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { buildCategoryOptions } from "@/features/products/category-options";
import { useSaveProductMutation } from "@/features/products/hooks/use-save-product-mutation";
import { calculateRecipePricing } from "@/features/products/pricing";
import {
  type ProductFormInput,
  productFormSchema,
} from "@/features/products/schemas";
import type { Product } from "@/features/products/types";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";
import { ProductImagePicker } from "./product-image-picker";
import { ProductPricingSummary } from "./product-pricing-summary";
import { RecipeEditor } from "./recipe-editor";

const EMPTY_INGREDIENTS: Ingredient[] = [];

const EMPTY_PRODUCT_FORM: DefaultValues<ProductFormInput> = {
  name: "",
  categoryId: NONE_SELECT_VALUE,
  isActive: true,
  imageUrl: "",
  recipe: [],
};

function toFormValues(product: Product): DefaultValues<ProductFormInput> {
  return {
    name: product.name,
    categoryId: toSelectFieldValue(product.categoryId),
    price: product.price,
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? "",
    recipe: product.recipe,
  };
}

type ProductFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  product?: Product;
  onClose: () => void;
};

export function ProductFormDialog({
  organizationId,
  isOpen,
  product,
  onClose,
}: ProductFormDialogProps) {
  const saveProductMutation = useSaveProductMutation(organizationId);
  const categoriesQuery = useCategoriesQuery(organizationId);
  const ingredientsQuery = useIngredientsQuery(organizationId);
  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY_PRODUCT_FORM,
  });
  const [productName, price, recipe] = useWatch({
    control: form.control,
    name: ["name", "price", "recipe"],
  });
  const isEditing = Boolean(product);
  const ingredients = ingredientsQuery.data ?? EMPTY_INGREDIENTS;

  const categoryOptions = useMemo(
    () => buildCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const ingredientsById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  const pricing = calculateRecipePricing(
    Number.isFinite(price) ? price : 0,
    recipe ?? [],
    ingredientsById,
  );

  useEffect(() => {
    if (!isOpen) return;
    form.reset(product ? toFormValues(product) : EMPTY_PRODUCT_FORM);
    saveProductMutation.reset();
  }, [isOpen, product, form, saveProductMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    saveProductMutation.mutate(
      { productId: product?.id, values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Produto atualizado." : "Produto cadastrado.",
          );
          onClose();
        },
        onError: (error) => form.setError("name", { message: error.message }),
      },
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar produto" : "Novo produto"}
      description="Preço de venda e ficha técnica. O custo e a margem são calculados automaticamente."
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveProductMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup className="gap-7">
        <div className="grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <FieldGroup>
            <TextField
              control={form.control}
              name="name"
              label="Nome"
              placeholder="Ex.: Cappuccino"
              autoComplete="off"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="categoryId"
                label="Categoria"
                options={categoryOptions}
              />
              <NumberField
                control={form.control}
                name="price"
                label="Preço de venda"
                format="currency"
                placeholder="Ex.: R$ 12,00"
              />
            </div>
          </FieldGroup>
          <div className="order-first">
            <ProductImagePicker
              organizationId={organizationId}
              control={form.control}
              productName={productName}
            />
          </div>
        </div>

        <SwitchField
          control={form.control}
          name="isActive"
          label="Disponível no PDV"
          description="Produtos inativos continuam cadastrados, mas não aparecem para venda."
        />

        <FieldSet>
          <FieldLegend>Ficha técnica</FieldLegend>
          <FieldDescription>
            Os insumos e as quantidades usadas para fazer uma unidade do
            produto.
          </FieldDescription>
          <RecipeEditor
            control={form.control}
            ingredients={ingredients}
            ingredientsById={ingredientsById}
          />
        </FieldSet>

        <ProductPricingSummary pricing={pricing} />
      </FieldGroup>
    </FormDialog>
  );
}
