"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { FieldGroup } from "@/components/ui/field";
import { useCreateStockEntryMutation } from "@/features/ingredients/hooks/use-create-stock-entry-mutation";
import { getUnitSymbol } from "@/features/ingredients/measure-units";
import {
  type StockEntryFormInput,
  stockEntryFormSchema,
} from "@/features/ingredients/schemas";
import type { Ingredient } from "@/features/ingredients/types";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { toSelectFieldValue } from "@/lib/optional-select-value";
import { StockEntryProjectionSummary } from "./stock-entry-projection-summary";

function buildDefaultValues(
  ingredient: Ingredient | null,
): DefaultValues<StockEntryFormInput> {
  return {
    supplierId: toSelectFieldValue(ingredient?.supplierId ?? null),
    expiresAt: "",
    paymentDueDate: "",
  };
}

type StockEntryDialogProps = {
  organizationId: OrganizationId;
  ingredient: Ingredient | null;
  onClose: () => void;
};

export function StockEntryDialog({
  organizationId,
  ingredient,
  onClose,
}: StockEntryDialogProps) {
  const isOpen = ingredient !== null;
  const createStockEntryMutation = useCreateStockEntryMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const form = useForm<StockEntryFormInput>({
    resolver: zodResolver(stockEntryFormSchema),
    defaultValues: buildDefaultValues(null),
  });
  const [quantity, totalCost] = useWatch({
    control: form.control,
    name: ["quantity", "totalCost"],
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(buildDefaultValues(ingredient));
    createStockEntryMutation.reset();
  }, [isOpen, ingredient, form, createStockEntryMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!ingredient) return;
    createStockEntryMutation.mutate(
      { ingredientId: ingredient.id, values },
      {
        onSuccess: () => {
          toast.success("Entrada registrada.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  const unitSymbol = ingredient ? getUnitSymbol(ingredient.unit) : undefined;

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={
        ingredient ? `Entrada de ${ingredient.name}` : "Entrada de estoque"
      }
      description="Registre uma compra. O estoque e o custo médio são atualizados automaticamente."
      submitLabel="Registrar"
      isSubmitting={createStockEntryMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantidade comprada"
            format="quantity"
            suffix={unitSymbol}
            placeholder="Ex.: 12"
          />
          <NumberField
            control={form.control}
            name="totalCost"
            label="Valor total pago"
            format="currency"
            placeholder="Ex.: $ 60,00"
          />
        </div>
        <SelectField
          control={form.control}
          name="supplierId"
          label="Fornecedor"
          options={supplierOptions}
          description={
            hasSuppliers
              ? undefined
              : "Cadastre fornecedores no módulo Fornecedores para vinculá-los às compras."
          }
        />
        <DateField
          control={form.control}
          name="paymentDueDate"
          label="Data de pagamento"
          description="Com data, a compra entra como conta a pagar no financeiro. Deixe em branco se já pagou."
        />
        <DateField
          control={form.control}
          name="expiresAt"
          label="Validade do lote"
          description="Se informada, passa a ser a validade do insumo."
        />
        {ingredient && (
          <StockEntryProjectionSummary
            ingredient={ingredient}
            quantity={quantity ?? 0}
            totalCost={totalCost ?? 0}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
