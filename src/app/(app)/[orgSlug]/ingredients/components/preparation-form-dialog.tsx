"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import {
  getUnitSymbol,
  MEASURE_UNIT_OPTIONS,
  toSelectableMeasureUnit,
} from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSavePreparationMutation } from "@/features/prepared-ingredients/hooks/use-save-preparation-mutation";
import { parsePreparationSteps } from "@/features/prepared-ingredients/preparation-steps";
import {
  type PreparationFormInput,
  preparationFormSchema,
} from "@/features/prepared-ingredients/schemas";
import { PreparedRecipeFields } from "./prepared-recipe-fields";

const EMPTY_PREPARATION: DefaultValues<PreparationFormInput> = {
  name: "",
  recipe: [],
  steps: [],
};

function toFormValues(
  preparation: Ingredient | null,
): DefaultValues<PreparationFormInput> {
  if (!preparation) return EMPTY_PREPARATION;
  return {
    name: preparation.name,
    unit: toSelectableMeasureUnit(preparation.unit) ?? "unit",
    minimumStock: preparation.minimumStock || undefined,
    yieldQuantity: preparation.yieldQuantity ?? undefined,
    recipe: preparation.components.map((component) => ({
      ingredientId: component.ingredientId,
      quantity: component.quantity,
    })),
    steps: parsePreparationSteps(preparation.preparationInstructions).map(
      (text) => ({ text }),
    ),
  };
}

type PreparationFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  preparation: Ingredient | null;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

export function PreparationFormDialog({
  organizationId,
  isOpen,
  preparation,
  ingredients,
  onClose,
}: PreparationFormDialogProps) {
  const saveMutation = useSavePreparationMutation(organizationId);
  const form = useForm<PreparationFormInput>({
    resolver: zodResolver(preparationFormSchema),
    defaultValues: EMPTY_PREPARATION,
  });
  const unit = useWatch({ control: form.control, name: "unit" });
  const unitSymbol = unit ? getUnitSymbol(unit) : undefined;
  const isEditing = preparation !== null;
  const componentOptions = useMemo(
    () => ingredients.filter(({ id }) => id !== preparation?.id),
    [ingredients, preparation?.id],
  );

  useEffect(() => {
    if (!isOpen) return;
    form.reset(toFormValues(preparation));
    saveMutation.reset();
  }, [isOpen, preparation, form, saveMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { preparationId: preparation?.id, values },
      {
        onSuccess: () => {
          toast.success(
            isEditing
              ? "Preparo atualizado."
              : "Preparo cadastrado. Use Produzir quando fizer.",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar preparo" : "Novo preparo"}
      description="O que vocês fazem na casa com os insumos, como caldas, cremes e massas. Ao produzir, os insumos da receita saem do estoque e o preparo entra."
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Calda de caramelo"
          autoComplete="off"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="unit"
            label="Unidade de medida"
            placeholder="Selecione"
            options={MEASURE_UNIT_OPTIONS}
            isDisabled={isEditing}
          />
          <NumberField
            control={form.control}
            name="minimumStock"
            label="Estoque mínimo (opcional)"
            format="quantity"
            suffix={unitSymbol}
            placeholder="Ex.: 200"
          />
        </div>
        <PreparedRecipeFields
          control={form.control}
          componentOptions={componentOptions}
          unitSymbol={unitSymbol}
          recipeError={form.formState.errors.recipe?.message}
        />
      </FieldGroup>
    </FormDialog>
  );
}
