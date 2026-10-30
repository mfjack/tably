"use client";

import { useMemo } from "react";
import { type Control, type FieldValues, useWatch } from "react-hook-form";
import { NumberField } from "@/components/form/number-field";
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { Ingredient } from "@/features/ingredients/types";
import type { PreparedRecipeFormInput } from "@/features/prepared-ingredients/schemas";
import { calculateRecipeLineCost } from "@/features/products/pricing";
import { formatCurrency } from "@/lib/format";
import { RecipeEditor } from "../../products/components/recipe-editor";
import { PreparationStepsEditor } from "./preparation-steps-editor";

type PreparedRecipeFieldsProps<
  TFieldValues extends FieldValues & PreparedRecipeFormInput,
> = {
  control: Control<TFieldValues>;
  componentOptions: readonly Ingredient[];
  unitSymbol: string | undefined;
  recipeError: string | undefined;
};

export function PreparedRecipeFields<
  TFieldValues extends FieldValues & PreparedRecipeFormInput,
>({
  control: formControl,
  componentOptions,
  unitSymbol,
  recipeError,
}: PreparedRecipeFieldsProps<TFieldValues>) {
  const control = formControl as unknown as Control<PreparedRecipeFormInput>;
  const [yieldQuantity, recipe] = useWatch({
    control,
    name: ["yieldQuantity", "recipe"],
  });
  const componentsById = useMemo(
    () => new Map(componentOptions.map((option) => [option.id, option])),
    [componentOptions],
  );
  const batchCost = (recipe ?? []).reduce(
    (total, recipeItem) =>
      total + calculateRecipeLineCost(recipeItem, componentsById),
    0,
  );
  const unitCost = yieldQuantity ? batchCost / yieldQuantity : 0;

  return (
    <>
      <NumberField
        control={control}
        name="yieldQuantity"
        label="Uma receita rende"
        format="quantity"
        suffix={unitSymbol}
        placeholder="Ex.: 800"
      />
      <FieldSet>
        <FieldLegend>Insumos de uma receita</FieldLegend>
        <FieldDescription>
          O que vai em uma receita e quanto de cada um.
        </FieldDescription>
        <RecipeEditor
          control={control}
          ingredients={componentOptions}
          ingredientsById={componentsById}
        />
        {recipeError && <FieldError>{recipeError}</FieldError>}
      </FieldSet>
      <PreparationStepsEditor control={control} />
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm">
        <div className="flex flex-col">
          <dt className="text-muted-foreground text-xs">
            Custo de uma receita
          </dt>
          <dd className="font-semibold tabular-nums">
            {formatCurrency(batchCost)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground text-xs">
            Custo por {unitSymbol ?? "unidade"}
          </dt>
          <dd className="font-semibold tabular-nums">
            {yieldQuantity ? formatCurrency(unitCost) : "Informe o rendimento"}
          </dd>
        </div>
      </dl>
    </>
  );
}
