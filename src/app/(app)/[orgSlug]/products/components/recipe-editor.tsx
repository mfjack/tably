"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  type Control,
  type FieldValues,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { NumberField } from "@/components/form/number-field";
import { SelectField, type SelectOption } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import { calculateRecipeLineCost } from "@/features/products/pricing";
import type { RecipeItemInput } from "@/features/products/schemas";
import { formatCurrency } from "@/lib/format";

const RECIPE_GRID_CLASS_NAME =
  "grid grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.25rem] items-start gap-2";

type RecipeFields = { recipe: RecipeItemInput[] };

type RecipeEditorProps<TFieldValues extends FieldValues & RecipeFields> = {
  control: Control<TFieldValues>;
  ingredients: readonly Ingredient[];
  ingredientsById: ReadonlyMap<string, Ingredient>;
};

export function RecipeEditor<TFieldValues extends FieldValues & RecipeFields>({
  control: formControl,
  ingredients,
  ingredientsById,
}: RecipeEditorProps<TFieldValues>) {
  const control = formControl as unknown as Control<RecipeFields>;
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { fields, append, remove } = useFieldArray({ control, name: "recipe" });
  const recipe = useWatch({ control, name: "recipe" });

  const ingredientOptions = useMemo<SelectOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: `${ingredient.name} (${getUnitSymbol(ingredient.unit)})`,
      })),
    [ingredients],
  );

  if (ingredients.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-5 text-center text-muted-foreground text-sm">
        Cadastre insumos em{" "}
        <Link
          href={buildOrganizationPath(
            orgSlug,
            getAppModule("ingredients").path,
          )}
          className="font-medium text-primary hover:underline"
        >
          Insumos
        </Link>{" "}
        para montar a ficha técnica.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length > 0 && (
        <div
          aria-hidden
          className={`${RECIPE_GRID_CLASS_NAME} font-medium text-muted-foreground text-xs`}
        >
          <span>Insumo</span>
          <span>Quantidade</span>
          <span className="text-right">Custo</span>
        </div>
      )}

      {fields.map((recipeField, index) => {
        const recipeLine = recipe?.[index];
        const selectedIngredient = recipeLine?.ingredientId
          ? ingredientsById.get(recipeLine.ingredientId)
          : undefined;
        const lineCost = recipeLine
          ? calculateRecipeLineCost(recipeLine, ingredientsById)
          : 0;

        return (
          <div key={recipeField.id} className={RECIPE_GRID_CLASS_NAME}>
            <SelectField
              control={control}
              name={`recipe.${index}.ingredientId`}
              label={`Insumo ${index + 1}`}
              isLabelHidden
              placeholder="Selecione"
              options={ingredientOptions}
            />
            <NumberField
              control={control}
              name={`recipe.${index}.quantity`}
              label={`Quantidade do insumo ${index + 1}`}
              isLabelHidden
              format="quantity"
              suffix={
                selectedIngredient
                  ? getUnitSymbol(selectedIngredient.unit)
                  : undefined
              }
              placeholder="Ex.: 200"
            />
            <span className="flex h-12 items-center justify-end text-muted-foreground text-sm tabular-nums">
              {formatCurrency(lineCost)}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="icon-lg"
              className="mt-1"
              aria-label={`Remover insumo ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="h-10 self-start"
        onClick={() => append({ ingredientId: "", quantity: Number.NaN })}
      >
        <Plus aria-hidden />
        Adicionar insumo
      </Button>
    </div>
  );
}
