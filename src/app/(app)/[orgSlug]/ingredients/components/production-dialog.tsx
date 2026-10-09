"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useRegisterProductionMutation } from "@/features/prepared-ingredients/hooks/use-register-production-mutation";
import {
  type ProductionFormInput,
  productionFormSchema,
} from "@/features/prepared-ingredients/schemas";
import { cn } from "@/lib/utils";

type ProductionDialogProps = {
  organizationId: OrganizationId;
  ingredient: Ingredient;
  ingredientsById: ReadonlyMap<string, Ingredient>;
  onClose: () => void;
};

export function ProductionDialog({
  organizationId,
  ingredient,
  ingredientsById,
  onClose,
}: ProductionDialogProps) {
  const productionMutation = useRegisterProductionMutation(organizationId);
  const form = useForm<ProductionFormInput>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: { batches: undefined, producedQuantity: undefined },
  });
  const batchesValue = useWatch({ control: form.control, name: "batches" });
  const batches = batchesValue && batchesValue > 0 ? batchesValue : 1;
  const expectedQuantity = (ingredient.yieldQuantity ?? 0) * batches;
  const unitSymbol = getUnitSymbol(ingredient.unit);

  const handleSubmit = form.handleSubmit((values) =>
    productionMutation.mutate(
      { ingredientId: ingredient.id, values },
      {
        onSuccess: ({ producedQuantity }) => {
          toast.success("Produção registrada.", {
            description: `Entrou ${formatItemQuantity(producedQuantity, ingredient.unit)} de ${ingredient.name}; os insumos da receita saíram do estoque.`,
          });
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
      title={`Produzir ${ingredient.name}`}
      description="Os insumos da receita saem do estoque e o que foi produzido entra."
      submitLabel="Registrar produção"
      isSubmitting={productionMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <NumberField
          control={form.control}
          name="batches"
          label="Quantas receitas fez"
          format="quantity"
          placeholder="1"
        />
        <section className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Vai sair do estoque</h3>
          <ul className="flex flex-col divide-y rounded-xl border">
            {ingredient.components.map((component) => {
              const componentIngredient = ingredientsById.get(
                component.ingredientId,
              );
              if (!componentIngredient) return null;
              const neededQuantity = component.quantity * batches;
              const isShort = componentIngredient.currentStock < neededQuantity;
              return (
                <li
                  key={component.ingredientId}
                  className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span className="truncate">{componentIngredient.name}</span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      isShort && "font-medium text-destructive",
                    )}
                  >
                    {formatItemQuantity(
                      neededQuantity,
                      componentIngredient.unit,
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · tem{" "}
                      {formatItemQuantity(
                        componentIngredient.currentStock,
                        componentIngredient.unit,
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <NumberField
          control={form.control}
          name="producedQuantity"
          label="Quanto rendeu"
          description="Deixe vazio se rendeu o previsto. Se rendeu menos, a diferença fica como perda na produção."
          format="quantity"
          suffix={unitSymbol}
          placeholder={`Previsto: ${formatItemQuantity(expectedQuantity, ingredient.unit)}`}
        />
      </FieldGroup>
    </FormDialog>
  );
}
