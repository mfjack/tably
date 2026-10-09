"use client";

import { CookingPot } from "lucide-react";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useRegisterProductionMutation } from "@/features/prepared-ingredients/hooks/use-register-production-mutation";
import { parsePreparationSteps } from "@/features/prepared-ingredients/preparation-steps";
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
  const expectedQuantity = ingredient.yieldQuantity ?? 0;
  const preparationSteps = parsePreparationSteps(
    ingredient.preparationInstructions,
  );

  function registerProduction() {
    productionMutation.mutate(ingredient.id, {
      onSuccess: ({ producedQuantity }) => {
        toast.success("Produção registrada.", {
          description: `Entrou ${formatItemQuantity(producedQuantity, ingredient.unit)} de ${ingredient.name}; os insumos da receita saíram do estoque.`,
        });
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DetailsDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={`Produzir ${ingredient.name}`}
      size="large"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={DIALOG_ACTION_BUTTON_CLASS_NAME}
            isLoading={productionMutation.isPending}
            onClick={registerProduction}
          >
            <CookingPot aria-hidden />
            Registrar produção
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-muted-foreground text-sm">
          Uma receita rende{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatItemQuantity(expectedQuantity, ingredient.unit)}
          </span>
          . Ao registrar, os insumos abaixo saem do estoque e a produção entra.
        </p>
        <section className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Vai sair do estoque</h3>
          <ul className="flex flex-col divide-y rounded-xl border">
            {ingredient.components.map((component) => {
              const componentIngredient = ingredientsById.get(
                component.ingredientId,
              );
              if (!componentIngredient) return null;
              const isShort =
                componentIngredient.currentStock < component.quantity;
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
                      component.quantity,
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
        {preparationSteps.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Modo de preparo</h3>
            <ol className="flex list-decimal flex-col gap-1.5 rounded-xl bg-muted/50 py-3 pr-4 pl-9 text-sm marker:font-semibold marker:text-muted-foreground">
              {preparationSteps.map((step, index) => (
                <li key={`${index.toString()}-${step}`}>{step}</li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </DetailsDialog>
  );
}
