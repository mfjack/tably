"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useUpdateIngredientMutation } from "@/features/ingredients/hooks/use-update-ingredient-mutation";
import {
  getEditableMeasureUnitOptions,
  getUnitSymbol,
  toSelectableMeasureUnit,
} from "@/features/ingredients/measure-units";
import {
  type IngredientFormInput,
  ingredientFormSchema,
} from "@/features/ingredients/schemas";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { toSelectFieldValue } from "@/lib/optional-select-value";

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
  ingredient: Ingredient | null;
  onClose: () => void;
};

export function IngredientFormDialog({
  organizationId,
  ingredient,
  onClose,
}: IngredientFormDialogProps) {
  const isOpen = ingredient !== null;
  const updateIngredientMutation = useUpdateIngredientMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const form = useForm<IngredientFormInput>({
    resolver: zodResolver(ingredientFormSchema),
  });
  const selectedUnit = useWatch({ control: form.control, name: "unit" });
  const unitSymbol = selectedUnit ? getUnitSymbol(selectedUnit) : undefined;

  useEffect(() => {
    if (!ingredient) return;
    form.reset(toFormValues(ingredient));
    updateIngredientMutation.reset();
  }, [ingredient, form, updateIngredientMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!ingredient) return;
    updateIngredientMutation.mutate(
      { ingredientId: ingredient.id, values },
      {
        onSuccess: () => {
          toast.success("Insumo atualizado.");
          onClose();
        },
        onError: (error) => form.setError("name", { message: error.message }),
      },
    );
  });

  const unitOptions = ingredient
    ? getEditableMeasureUnitOptions(ingredient.unit, ingredient.isInUse)
    : [];

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Editar insumo"
      description="Para registrar uma compra, use a entrada de estoque. Aqui você corrige o estoque atual."
      submitLabel="Salvar"
      isSubmitting={updateIngredientMutation.isPending}
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
          <NumberField
            control={form.control}
            name="currentStock"
            label="Estoque atual"
            format="quantity"
            suffix={unitSymbol}
            placeholder="Ex.: 12"
          />
          <SelectField
            control={form.control}
            name="unit"
            label="Unidade de medida"
            placeholder="Selecione"
            options={unitOptions}
            isDisabled={unitOptions.length < 2}
          />
          <NumberField
            control={form.control}
            name="minimumStock"
            label="Estoque mínimo (alerta)"
            format="quantity"
            suffix={unitSymbol}
            placeholder="Ex.: 4"
          />
          {!ingredient?.isPrepared && (
            <NumberField
              control={form.control}
              name="currentStockCost"
              label="Valor pago pelo estoque (opcional)"
              format="currency"
              placeholder="Ex.: $ 60,00"
              description="Quanto custou o estoque atual. Recalcula o custo por unidade."
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
