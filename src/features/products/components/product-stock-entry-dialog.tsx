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
import { FreightCostField } from "@/features/ingredients/components/freight-cost-field";
import type { OrganizationId } from "@/features/organizations/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { formatQuantity } from "@/lib/format";
import { toSelectFieldValue } from "@/lib/optional-select-value";
import { useAddProductStockMutation } from "../hooks/use-add-product-stock-mutation";
import {
  type ProductStockEntryInput,
  productStockEntrySchema,
} from "../schemas";
import type { Product } from "../types";

type ProductStockEntryDialogProps = {
  organizationId: OrganizationId;
  product: Pick<
    Product,
    "id" | "name" | "stockQuantity" | "minimumStock" | "supplierId"
  > | null;
  onClose: () => void;
};

export function ProductStockEntryDialog({
  organizationId,
  product,
  onClose,
}: ProductStockEntryDialogProps) {
  const addStockMutation = useAddProductStockMutation(organizationId);
  const { supplierOptions } = useSupplierOptions(
    organizationId,
    product !== null,
  );
  const form = useForm<ProductStockEntryInput>({
    resolver: zodResolver(productStockEntrySchema),
  });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const currentStock = product?.stockQuantity ?? 0;

  useEffect(() => {
    if (!product) return;
    form.reset({
      paymentDate: "",
      minimumStock: product.minimumStock || undefined,
      supplierId: toSelectFieldValue(product.supplierId),
    } satisfies DefaultValues<ProductStockEntryInput>);
    addStockMutation.reset();
  }, [product, form, addStockMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!product) return;
    addStockMutation.mutate(
      { productId: product.id, values },
      {
        onSuccess: (stock) => {
          toast.success(`Entrada registrada. ${product.name}: ${stock} un.`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={product !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={product ? `Entrada de ${product.name}` : "Entrada de produto"}
      description={`No estoque agora: ${formatQuantity(currentStock)} un.`}
      submitLabel="Registrar"
      isSubmitting={addStockMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantidade que entrou"
            format="integer"
            suffix="un"
            placeholder="Ex.: 10"
            description={
              Number.isFinite(quantity) && quantity > 0
                ? `Fica com ${formatQuantity(currentStock + quantity)} un.`
                : undefined
            }
          />
          <NumberField
            control={form.control}
            name="totalCost"
            label="Valor total pago"
            format="currency"
            placeholder="Ex.: $ 60,00"
          />
          <FreightCostField control={form.control} name="freightCost" />
          <DateField
            control={form.control}
            name="paymentDate"
            label="Data de pagamento"
          />
          <NumberField
            control={form.control}
            name="minimumStock"
            label="Estoque mínimo (alerta)"
            format="integer"
            suffix="un"
            placeholder="Ex.: 3"
          />
          <SelectField
            control={form.control}
            name="supplierId"
            label="Fornecedor"
            options={supplierOptions}
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
