"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveIngredientMutation } from "@/features/ingredients/hooks/use-save-ingredient-mutation";
import {
  getUnitSymbol,
  MEASURE_UNIT_OPTIONS,
} from "@/features/ingredients/measure-units";
import {
  type IngredientFormInput,
  ingredientFormSchema,
} from "@/features/ingredients/schemas";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import {
  NONE_SELECT_VALUE,
  toSelectFieldValue,
} from "@/lib/optional-select-value";

const EMPTY_INGREDIENT_FORM: DefaultValues<IngredientFormInput> = {
  name: "",
  brand: "",
  supplierId: NONE_SELECT_VALUE,
  expiresAt: "",
};

function toFormValues(
  ingredient: Ingredient,
): DefaultValues<IngredientFormInput> {
  return {
    name: ingredient.name,
    brand: ingredient.brand ?? "",
    unit: ingredient.unit,
    minimumStock: ingredient.minimumStock,
    supplierId: toSelectFieldValue(ingredient.supplierId),
    expiresAt: ingredient.expiresAt ?? "",
  };
}

type IngredientFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  ingredient?: Ingredient;
  onClose: () => void;
};

export function IngredientFormDialog({
  organizationId,
  isOpen,
  ingredient,
  onClose,
}: IngredientFormDialogProps) {
  const saveIngredientMutation = useSaveIngredientMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const form = useForm<IngredientFormInput>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: EMPTY_INGREDIENT_FORM,
  });
  const selectedUnit = useWatch({ control: form.control, name: "unit" });
  const unitSymbol = selectedUnit ? getUnitSymbol(selectedUnit) : undefined;
  const isEditing = Boolean(ingredient);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(ingredient ? toFormValues(ingredient) : EMPTY_INGREDIENT_FORM);
    saveIngredientMutation.reset();
  }, [isOpen, ingredient, form, saveIngredientMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    saveIngredientMutation.mutate(
      { ingredientId: ingredient?.id, values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Insumo atualizado." : "Insumo cadastrado.",
          );
          onClose();
        },
        onError: (error) => form.setError("name", { message: error.message }),
      },
    );
  });

  const unitField = (
    <SelectField
      control={form.control}
      name="unit"
      label="Unidade de medida"
      placeholder="Selecione"
      options={MEASURE_UNIT_OPTIONS}
      isDisabled={isEditing}
    />
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar insumo" : "Novo insumo"}
      description={
        isEditing
          ? "O estoque e o custo mudam pelas entradas de estoque."
          : "Informe o que você comprou. O custo por unidade é calculado automaticamente."
      }
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveIngredientMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Leite integral"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="brand"
          label="Marca"
          placeholder="Opcional"
          autoComplete="off"
        />
        {isEditing ? (
          unitField
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              control={form.control}
              name="quantity"
              label="Quantidade comprada"
              format="quantity"
              suffix={unitSymbol}
              placeholder="Ex.: 12"
            />
            {unitField}
          </div>
        )}
        <NumberField
          control={form.control}
          name="minimumStock"
          label="Estoque mínimo (alerta)"
          format="quantity"
          suffix={unitSymbol}
          placeholder="Ex.: 4"
          description="Abaixo disso, o Tably avisa que é hora de comprar."
        />
        {!isEditing && (
          <NumberField
            control={form.control}
            name="totalCost"
            label="Valor total pago"
            format="currency"
            placeholder="Quanto custou essa compra toda"
          />
        )}
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
        <TextField
          control={form.control}
          name="expiresAt"
          label="Validade"
          type="date"
        />
      </FieldGroup>
    </FormDialog>
  );
}
