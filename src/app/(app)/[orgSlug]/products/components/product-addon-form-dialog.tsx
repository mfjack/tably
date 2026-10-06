"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSaveProductAddonMutation } from "@/features/product-addons/hooks/use-save-product-addon-mutation";
import {
  type ProductAddonFormInput,
  productAddonFormSchema,
} from "@/features/product-addons/schemas";
import type { ProductAddon } from "@/features/product-addons/types";
import {
  fromSelectFieldValue,
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

const EMPTY_ADDON_FORM: DefaultValues<ProductAddonFormInput> = {
  name: "",
  isActive: true,
  ingredientId: NONE_SELECT_VALUE,
};

function toFormValues(
  addon: ProductAddon,
): DefaultValues<ProductAddonFormInput> {
  return {
    name: addon.name,
    price: addon.price,
    isActive: addon.isActive,
    ingredientId: toSelectFieldValue(addon.ingredientId),
    ingredientQuantity: addon.ingredientQuantity ?? undefined,
  };
}

type ProductAddonFormDialogProps = {
  organizationId: OrganizationId;
  addon?: ProductAddon;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

export function ProductAddonFormDialog({
  organizationId,
  addon,
  ingredients,
  onClose,
}: ProductAddonFormDialogProps) {
  const saveMutation = useSaveProductAddonMutation(organizationId);
  const form = useForm<ProductAddonFormInput>({
    resolver: zodResolver(productAddonFormSchema),
    defaultValues: addon ? toFormValues(addon) : EMPTY_ADDON_FORM,
  });
  const ingredientId = useWatch({
    control: form.control,
    name: "ingredientId",
  });
  const selectedIngredient = ingredients.find(
    (ingredient) => ingredient.id === fromSelectFieldValue(ingredientId),
  );
  const isEditing = Boolean(addon);

  const ingredientOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Não baixa do estoque" },
      ...ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.name,
      })),
    ],
    [ingredients],
  );

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { addonId: addon?.id, values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Adicional atualizado." : "Adicional cadastrado.",
          );
          onClose();
        },
        onError: (error) => form.setError("name", { message: error.message }),
      },
    ),
  );

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar adicional" : "Novo adicional"}
      description="Depois, escolha no cadastro de cada produto quais adicionais ele aceita."
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Nome"
            placeholder="Ex.: Granola"
            autoComplete="off"
          />
          <NumberField
            control={form.control}
            name="price"
            label="Preço"
            format="currency"
            placeholder="Ex.: $ 2,00"
          />
        </div>
        <SelectField
          control={form.control}
          name="ingredientId"
          label="Insumo usado"
          options={ingredientOptions}
        />
        {selectedIngredient && (
          <NumberField
            control={form.control}
            name="ingredientQuantity"
            label="Quantidade por porção"
            format="quantity"
            suffix={getUnitSymbol(selectedIngredient.unit)}
            placeholder="Ex.: 30"
          />
        )}
        <SwitchField
          control={form.control}
          name="isActive"
          label="Disponível"
          description="Adicionais indisponíveis não aparecem na hora de vender."
        />
      </FieldGroup>
    </FormDialog>
  );
}
