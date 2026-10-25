"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { type DefaultValues, useController, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useRegisterStockLossMutation } from "@/features/stock-losses/hooks/use-register-stock-loss-mutation";
import { useUpdateStockLossMutation } from "@/features/stock-losses/hooks/use-update-stock-loss-mutation";
import {
  STOCK_LOSS_REASON_LABELS,
  STOCK_LOSS_REASONS,
} from "@/features/stock-losses/labels";
import {
  type StockLossFormInput,
  stockLossFormSchema,
} from "@/features/stock-losses/schemas";
import type { StockLoss } from "@/features/stock-losses/types";

function toFormValues(
  loss: StockLoss | undefined,
  initialIngredient: Ingredient | undefined,
): DefaultValues<StockLossFormInput> {
  if (!loss) return { ingredientId: initialIngredient?.id ?? "", note: "" };
  return {
    ingredientId: loss.ingredientId,
    quantity: loss.quantity,
    reason: loss.reason,
    note: loss.note ?? "",
    totalValue: loss.value > 0 ? loss.value : undefined,
  };
}

type StockLossFormDialogProps = {
  organizationId: OrganizationId;
  ingredients: readonly Ingredient[];
  initialIngredient?: Ingredient;
  loss?: StockLoss;
  onClose: () => void;
};

export function StockLossFormDialog({
  organizationId,
  ingredients,
  initialIngredient,
  loss,
  onClose,
}: StockLossFormDialogProps) {
  const registerMutation = useRegisterStockLossMutation(organizationId);
  const updateMutation = useUpdateStockLossMutation(organizationId);
  const isEditing = loss !== undefined;
  const form = useForm<StockLossFormInput>({
    resolver: zodResolver(stockLossFormSchema),
    defaultValues: toFormValues(loss, initialIngredient),
  });
  const ingredientField = useController({
    control: form.control,
    name: "ingredientId",
  });
  const reasonField = useController({ control: form.control, name: "reason" });
  const selectedIngredient = ingredients.find(
    (ingredient) => ingredient.id === ingredientField.field.value,
  );

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.name,
      })),
    [ingredients],
  );

  const handleSubmit = form.handleSubmit((values) => {
    if (loss) {
      updateMutation.mutate(
        { lossId: loss.id, values },
        {
          onSuccess: () => {
            toast.success("Perda atualizada.");
            onClose();
          },
          onError: (error) => toast.error(error.message),
        },
      );
      return;
    }
    registerMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Perda registrada.", {
          description: selectedIngredient
            ? `${formatItemQuantity(values.quantity, selectedIngredient.unit)} de ${selectedIngredient.name} saiu do estoque.`
            : undefined,
        });
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  });

  return (
    <FormDialog
      isOpen
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar perda" : "Registrar perda"}
      description={
        isEditing
          ? "Se mudar a quantidade, o estoque é ajustado pela diferença."
          : "O que foi jogado fora sai do estoque e entra no total de perdas do mês."
      }
      submitLabel={isEditing ? "Salvar" : "Registrar perda"}
      isSubmitting={registerMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SelectField
          control={form.control}
          name="ingredientId"
          label="Insumo"
          placeholder="Escolha o insumo"
          options={ingredientOptions}
          isDisabled={isEditing}
        />
        <NumberField
          control={form.control}
          name="quantity"
          label="Quantidade perdida"
          format="quantity"
          suffix={
            selectedIngredient
              ? getUnitSymbol(selectedIngredient.unit)
              : undefined
          }
          placeholder="Ex.: 500"
          description={
            selectedIngredient
              ? `No estoque: ${formatItemQuantity(selectedIngredient.currentStock, selectedIngredient.unit)}`
              : undefined
          }
        />
        <NumberField
          control={form.control}
          name="totalValue"
          label="Valor da perda (opcional)"
          format="currency"
          placeholder="Ex.: $ 28,00"
          description="Vazio: calcula pelo custo do insumo."
        />
        <FieldSet>
          <FieldLegend variant="label">Motivo</FieldLegend>
          <div className="grid grid-cols-2 gap-2">
            {STOCK_LOSS_REASONS.map((reason) => (
              <ToggleChip
                key={reason}
                label={STOCK_LOSS_REASON_LABELS[reason]}
                isSelected={reasonField.field.value === reason}
                onToggle={() => reasonField.field.onChange(reason)}
                className="w-full justify-center"
              />
            ))}
          </div>
          {reasonField.fieldState.error && (
            <FieldError>{reasonField.fieldState.error.message}</FieldError>
          )}
        </FieldSet>
        <TextField
          control={form.control}
          name="note"
          label="Observação (opcional)"
          placeholder="Ex.: leite azedou na geladeira"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
