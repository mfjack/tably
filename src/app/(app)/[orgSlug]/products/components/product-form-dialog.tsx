"use client";

import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { useCreateOrEditResolver } from "@/components/form/use-create-or-edit-resolver";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { useCategoriesQuery } from "@/features/categories/hooks/use-categories-query";
import { useIngredientsMap } from "@/features/ingredients/hooks/use-ingredients-map";
import type { OrganizationId } from "@/features/organizations/types";
import { buildCategoryOptions } from "@/features/products/category-options";
import { useSaveProductMutation } from "@/features/products/hooks/use-save-product-mutation";
import { calculateRecipePricing } from "@/features/products/pricing";
import {
  type ProductFormInput,
  productCreateFormSchema,
  productFormSchema,
} from "@/features/products/schemas";
import type { Product } from "@/features/products/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";
import { ProductAddonsField } from "./product-addons-field";
import { ProductImagePicker } from "./product-image-picker";
import { ProductPricingSummary } from "./product-pricing-summary";
import { RecipeEditor } from "./recipe-editor";

const EMPTY_PRODUCT_FORM: DefaultValues<ProductFormInput> = {
  name: "",
  isActive: true,
  isOnMenu: true,
  menuDetail: "",
  imageUrl: "",
  recipe: [],
  addonIds: [],
  isStockTracked: false,
  supplierId: NONE_SELECT_VALUE,
  paymentDate: "",
};

function toFormValues(product: Product): DefaultValues<ProductFormInput> {
  return {
    name: product.name,
    categoryId: product.categoryId ?? undefined,
    price: product.price,
    isActive: product.isActive,
    isOnMenu: product.isOnMenu,
    menuDetail: product.menuDetail ?? "",
    imageUrl: product.imageUrl ?? "",
    recipe: product.recipe,
    addonIds: product.addons.map((addon) => addon.id),
    isStockTracked: product.stockQuantity !== null,
    stockQuantity: product.stockQuantity ?? undefined,
    minimumStock: product.minimumStock || undefined,
    supplierId: toSelectFieldValue(product.supplierId),
  };
}

type ProductFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  isAddonsEnabled: boolean;
  product?: Product;
  onClose: () => void;
};

export function ProductFormDialog({
  organizationId,
  isOpen,
  isAddonsEnabled,
  product,
  onClose,
}: ProductFormDialogProps) {
  const saveProductMutation = useSaveProductMutation(organizationId);
  const categoriesQuery = useCategoriesQuery(organizationId);
  const { ingredients, ingredientsById } = useIngredientsMap(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const resolver = useCreateOrEditResolver<ProductFormInput>(Boolean(product), {
    create: productCreateFormSchema,
    edit: productFormSchema,
  });
  const form = useForm<ProductFormInput>({
    resolver,
    defaultValues: EMPTY_PRODUCT_FORM,
  });
  const [productName, price, recipe, isStockTracked, isOnMenu] = useWatch({
    control: form.control,
    name: ["name", "price", "recipe", "isStockTracked", "isOnMenu"],
  });
  const isEditing = Boolean(product);

  const categoryOptions = useMemo(
    () => buildCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data],
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
                placeholder="Escolha a categoria"
                options={categoryOptions}
              />
              <NumberField
                control={form.control}
                name="price"
                label="Preço de venda"
                format="currency"
                placeholder="Ex.: $ 12,00"
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

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Venda</FieldLegend>
          <FieldDescription>
            Onde o produto aparece para ser vendido.
          </FieldDescription>
          <div className="grid gap-5 sm:grid-cols-2">
            <SwitchField
              control={form.control}
              name="isActive"
              label="Disponível no PDV"
              description="Desligado, continua cadastrado, mas não aparece para venda."
            />
            <SwitchField
              control={form.control}
              name="isOnMenu"
              label="Cardápio digital"
              description="Aparece na seção da categoria, se ela estiver no cardápio."
            />
          </div>
          {isOnMenu && (
            <TextField
              control={form.control}
              name="menuDetail"
              label="Detalhe no cardápio"
              placeholder="Ex.: 220ml"
              autoComplete="off"
            />
          )}
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Estoque</FieldLegend>
          <FieldDescription>
            Para produtos prontos que você compra ou faz em lote, como bolos e
            bebidas.
          </FieldDescription>
          <SwitchField
            control={form.control}
            name="isStockTracked"
            label="Controlar quantidade"
            description="O PDV desconta a cada venda e esgota em 0."
          />
          {isStockTracked && (
            <div className="grid items-start gap-5 sm:grid-cols-2">
              <NumberField
                control={form.control}
                name="stockQuantity"
                label={
                  isEditing ? "Quantidade em estoque" : "Quantidade comprada"
                }
                format="integer"
                suffix="un"
                placeholder="Ex.: 12"
              />
              <NumberField
                control={form.control}
                name="minimumStock"
                label="Estoque mínimo (alerta)"
                format="integer"
                suffix="un"
                placeholder="Ex.: 3"
              />
              {!isEditing && (
                <>
                  <NumberField
                    control={form.control}
                    name="totalCost"
                    label="Valor total pago (opcional)"
                    format="currency"
                    placeholder="Ex.: $ 60,00"
                  />
                  <DateField
                    control={form.control}
                    name="paymentDate"
                    label="Data de pagamento"
                  />
                </>
              )}
              <div className="sm:col-span-2">
                <SelectField
                  control={form.control}
                  name="supplierId"
                  label="Fornecedor"
                  options={supplierOptions}
                  description={
                    hasSuppliers
                      ? undefined
                      : "Cadastre fornecedores no módulo Fornecedores para vinculá-los."
                  }
                />
              </div>
            </div>
          )}
        </FieldSet>

        <FieldSeparator />

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

        {isAddonsEnabled && (
          <>
            <FieldSeparator />
            <ProductAddonsField
              organizationId={organizationId}
              control={form.control}
            />
          </>
        )}

        <ProductPricingSummary pricing={pricing} />
      </FieldGroup>
    </FormDialog>
  );
}
