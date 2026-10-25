"use client";

import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { useCreateOrEditResolver } from "@/components/form/use-create-or-edit-resolver";
import { FieldGroup } from "@/components/ui/field";
import { FreightCostField } from "@/features/ingredients/components/freight-cost-field";
import { useSaveIngredientMutation } from "@/features/ingredients/hooks/use-save-ingredient-mutation";
import {
  getEditableMeasureUnitOptions,
  getUnitSymbol,
  MEASURE_UNIT_OPTIONS,
  toSelectableMeasureUnit,
} from "@/features/ingredients/measure-units";
import {
  type IngredientFormInput,
  ingredientCreateFormSchema,
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
  supplierId: NONE_SELECT_VALUE,
  expiresAt: "",
  paymentDueDate: "",
};

function toFormValues(
  ingredient: Ingredient,
): DefaultValues<IngredientFormInput> {
  return {
    name: ingredient.name,
    unit: toSelectableMeasureUnit(ingredient.unit),
    minimumStock: ingredient.minimumStock,
    currentStock:
      ingredient.currentStock >= 0 ? ingredient.currentStock : undefined,
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
  const resolver = useCreateOrEditResolver<IngredientFormInput>(
    Boolean(ingredient),
    {
      create: ingredientCreateFormSchema,
      edit: ingredientFormSchema,
    },
  );
  const form = useForm<IngredientFormInput>({
    resolver,
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

  const unitOptions = ingredient
    ? getEditableMeasureUnitOptions(ingredient.unit, ingredient.isInUse)
    : MEASURE_UNIT_OPTIONS;

  const unitField = (
    <SelectField
      control={form.control}
      name="unit"
      label="Unidade de medida"
      placeholder="Selecione"
      options={unitOptions}
      isDisabled={unitOptions.length < 2}
    />
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar insumo" : "Novo insumo"}
      description={
        isEditing
          ? "Para registrar uma compra, use a entrada de estoque. Aqui você corrige o estoque atual."
          : "Informe o que você comprou. O custo por unidade é calculado automaticamente."
      }
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveIngredientMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Leite integral"
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {isEditing ? (
            <NumberField
              control={form.control}
              name="currentStock"
              label="Estoque atual"
              format="quantity"
              suffix={unitSymbol}
              placeholder="Ex.: 12"
            />
          ) : (
            <NumberField
              control={form.control}
              name="quantity"
              label="Quantidade comprada"
              format="quantity"
              suffix={unitSymbol}
              placeholder="Ex.: 12"
            />
          )}
          {unitField}
          {!isEditing && (
            <NumberField
              control={form.control}
              name="totalCost"
              label="Valor total pago"
              format="currency"
              placeholder="Ex.: $ 60,00"
            />
          )}
          {!isEditing && (
            <FreightCostField control={form.control} name="freightCost" />
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
          {isEditing && !ingredient?.isPrepared && (
            <NumberField
              control={form.control}
              name="currentStockCost"
              label="Valor pago pelo estoque (opcional)"
              format="currency"
              placeholder="Ex.: $ 60,00"
              description="Quanto custou o estoque atual. Recalcula o custo por unidade."
            />
          )}
          {!isEditing && (
            <DateField
              control={form.control}
              name="paymentDueDate"
              label="Data de pagamento"
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
          <DateField control={form.control} name="expiresAt" label="Validade" />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
