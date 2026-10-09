"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { SwitchField } from "@/components/form/switch-field";
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSavePreparedRecipeMutation } from "@/features/prepared-ingredients/hooks/use-save-prepared-recipe-mutation";
import { parsePreparationSteps } from "@/features/prepared-ingredients/preparation-steps";
import {
  type PreparedRecipeFormInput,
  preparedRecipeFormSchema,
} from "@/features/prepared-ingredients/schemas";
import { calculateRecipeLineCost } from "@/features/products/pricing";
import { formatCurrency } from "@/lib/format";
import { RecipeEditor } from "../../products/components/recipe-editor";
import { PreparationStepsEditor } from "./preparation-steps-editor";

type PreparedRecipeDialogProps = {
  organizationId: OrganizationId;
  ingredient: Ingredient;
  ingredients: readonly Ingredient[];
  onClose: () => void;
};

export function PreparedRecipeDialog({
  organizationId,
  ingredient,
  ingredients,
  onClose,
}: PreparedRecipeDialogProps) {
  const saveMutation = useSavePreparedRecipeMutation(organizationId);
  const form = useForm<PreparedRecipeFormInput>({
    resolver: zodResolver(preparedRecipeFormSchema),
    defaultValues: {
      isPrepared: ingredient.isPrepared || ingredient.components.length === 0,
      yieldQuantity: ingredient.yieldQuantity ?? undefined,
      recipe: ingredient.components.map((component) => ({
        ingredientId: component.ingredientId,
        quantity: component.quantity,
      })),
      steps: parsePreparationSteps(ingredient.preparationInstructions).map(
        (text) => ({ text }),
      ),
    },
  });
  const [isPrepared, yieldQuantity, recipe] = useWatch({
    control: form.control,
    name: ["isPrepared", "yieldQuantity", "recipe"],
  });
  const unitSymbol = getUnitSymbol(ingredient.unit);
  const componentOptions = useMemo(
    () => ingredients.filter(({ id }) => id !== ingredient.id),
    [ingredients, ingredient.id],
  );
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
  const recipeError = form.formState.errors.recipe?.message;

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { ingredientId: ingredient.id, values },
      {
        onSuccess: () => {
          toast.success(
            values.isPrepared
              ? "Receita salva. Use Produzir quando fizer."
              : "Insumo voltou a ser comprado.",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={`Receita de produção · ${ingredient.name}`}
      description="Para o que vocês mesmos preparam, como caldas e cremes. Ao produzir, os insumos da receita saem do estoque e este entra."
      submitLabel="Salvar receita"
      isSubmitting={saveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <SwitchField
          control={form.control}
          name="isPrepared"
          label="Produzido na casa"
          description="Desligue se esse insumo for comprado pronto."
        />
        {isPrepared && (
          <>
            <NumberField
              control={form.control}
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
                control={form.control}
                ingredients={componentOptions}
                ingredientsById={componentsById}
              />
              {recipeError && <FieldError>{recipeError}</FieldError>}
            </FieldSet>
            <PreparationStepsEditor control={form.control} />
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
                  Custo por {unitSymbol}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {yieldQuantity
                    ? `${formatCurrency(unitCost)}`
                    : "Informe o rendimento"}
                </dd>
              </div>
            </dl>
          </>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
