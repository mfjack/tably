"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addHours } from "date-fns";
import { useEffect, useMemo, useRef } from "react";
import {
  type DefaultValues,
  useController,
  useForm,
  useWatch,
} from "react-hook-form";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { ToggleChip } from "@/components/toggle-chip";
import {
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useSaveLabelDefaultsMutation } from "@/features/food-labels/hooks/use-save-label-defaults-mutation";
import {
  fromShelfLifeHours,
  SHELF_LIFE_UNIT_LABELS,
  SHELF_LIFE_UNITS,
  STORAGE_CONDITION_LABELS,
  STORAGE_CONDITIONS,
  toShelfLifeHours,
} from "@/features/food-labels/labels";
import {
  formatLabelDate,
  printFoodLabel,
} from "@/features/food-labels/print-food-label";
import {
  type FoodLabelFormInput,
  foodLabelFormSchema,
} from "@/features/food-labels/schemas";
import type { Ingredient, IngredientId } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import {
  fromSelectFieldValue,
  NONE_SELECT_VALUE,
} from "@/lib/optional-select-value";

type FoodLabelDialogProps = {
  organizationId: OrganizationId;
  ingredients: readonly Ingredient[];
  initialIngredient?: Ingredient;
  defaultResponsibleName: string;
  onClose: () => void;
};

function getIngredientLabelValues(
  ingredient: Ingredient,
): Pick<
  DefaultValues<FoodLabelFormInput>,
  "name" | "storage" | "shelfLifeAmount" | "shelfLifeUnit"
> {
  const shelfLife = ingredient.labelShelfLifeHours
    ? fromShelfLifeHours(ingredient.labelShelfLifeHours)
    : null;
  return {
    name: ingredient.name,
    storage: ingredient.labelStorage ?? undefined,
    shelfLifeAmount: shelfLife?.amount,
    shelfLifeUnit: shelfLife?.unit ?? "days",
  };
}

export function FoodLabelDialog({
  organizationId,
  ingredients,
  initialIngredient,
  defaultResponsibleName,
  onClose,
}: FoodLabelDialogProps) {
  const saveDefaultsMutation = useSaveLabelDefaultsMutation(organizationId);
  const form = useForm<FoodLabelFormInput>({
    resolver: zodResolver(foodLabelFormSchema),
    defaultValues: {
      ingredientId: initialIngredient?.id ?? NONE_SELECT_VALUE,
      responsibleName: defaultResponsibleName,
      ...(initialIngredient
        ? getIngredientLabelValues(initialIngredient)
        : { name: "", shelfLifeUnit: "days" }),
    },
  });
  const storageField = useController({
    control: form.control,
    name: "storage",
  });
  const unitField = useController({
    control: form.control,
    name: "shelfLifeUnit",
  });
  const [ingredientId, shelfLifeAmount, shelfLifeUnit] = useWatch({
    control: form.control,
    name: ["ingredientId", "shelfLifeAmount", "shelfLifeUnit"],
  });
  const previousIngredientIdRef = useRef(ingredientId);

  useEffect(() => {
    if (previousIngredientIdRef.current === ingredientId) return;
    previousIngredientIdRef.current = ingredientId;
    const ingredient = ingredients.find(({ id }) => id === ingredientId);
    if (!ingredient) return;
    form.reset({
      ...form.getValues(),
      ...getIngredientLabelValues(ingredient),
    });
  }, [ingredientId, ingredients, form]);

  const ingredientOptions = useMemo(
    () => [
      { value: NONE_SELECT_VALUE, label: "Item avulso (digitar o nome)" },
      ...ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.name,
      })),
    ],
    [ingredients],
  );

  const expiresPreview =
    shelfLifeAmount && shelfLifeAmount > 0 && shelfLifeUnit
      ? `Vence em ${formatLabelDate(addHours(new Date(), toShelfLifeHours(shelfLifeAmount, shelfLifeUnit)))}`
      : undefined;

  const handleSubmit = form.handleSubmit((values) => {
    const shelfLifeHours = toShelfLifeHours(
      values.shelfLifeAmount,
      values.shelfLifeUnit,
    );
    const preparedAt = new Date();
    printFoodLabel({
      name: values.name,
      storage: values.storage,
      preparedAt,
      expiresAt: addHours(preparedAt, shelfLifeHours),
      responsibleName: values.responsibleName,
      copies: values.copies ?? 1,
    });
    const selectedIngredientId = fromSelectFieldValue<IngredientId>(
      values.ingredientId,
    );
    if (selectedIngredientId) {
      saveDefaultsMutation.mutate({
        ingredientId: selectedIngredientId,
        values: { shelfLifeHours, storage: values.storage },
      });
    }
    onClose();
  });

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Etiqueta de validade"
      description="Para o que foi aberto ou preparado. A data de manipulação é a de agora; a validade e a conservação ficam guardadas no insumo para a próxima vez."
      submitLabel="Imprimir etiqueta"
      isSubmitting={false}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SelectField
          control={form.control}
          name="ingredientId"
          label="Insumo"
          options={ingredientOptions}
        />
        <TextField
          control={form.control}
          name="name"
          label="Nome na etiqueta"
          placeholder="Ex.: Calda de chocolate"
          autoComplete="off"
        />
        <FieldSet>
          <FieldLegend variant="label">Conservação</FieldLegend>
          <div className="grid grid-cols-3 gap-2">
            {STORAGE_CONDITIONS.map((storage) => (
              <ToggleChip
                key={storage}
                label={STORAGE_CONDITION_LABELS[storage]}
                isSelected={storageField.field.value === storage}
                onToggle={() => storageField.field.onChange(storage)}
                className="w-full justify-center"
              />
            ))}
          </div>
          {storageField.fieldState.error && (
            <FieldError>{storageField.fieldState.error.message}</FieldError>
          )}
        </FieldSet>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="shelfLifeAmount"
            label="Validade"
            format="integer"
            placeholder="Ex.: 3"
            description={expiresPreview}
          />
          <FieldSet>
            <FieldLegend variant="label">Em</FieldLegend>
            <div className="grid grid-cols-2 gap-2">
              {SHELF_LIFE_UNITS.map((unit) => (
                <ToggleChip
                  key={unit}
                  label={SHELF_LIFE_UNIT_LABELS[unit]}
                  isSelected={unitField.field.value === unit}
                  onToggle={() => unitField.field.onChange(unit)}
                  className="h-12 w-full justify-center"
                />
              ))}
            </div>
          </FieldSet>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="responsibleName"
            label="Responsável"
            placeholder="Ex.: Marlon"
            autoComplete="off"
          />
          <NumberField
            control={form.control}
            name="copies"
            label="Quantidade de etiquetas"
            format="integer"
            placeholder="1"
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
