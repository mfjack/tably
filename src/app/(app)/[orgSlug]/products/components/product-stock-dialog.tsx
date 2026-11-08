"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type DefaultValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useUpdateProductStockSettingsMutation } from "@/features/products/hooks/use-update-product-stock-settings-mutation";
import {
  type ProductStockSettingsInput,
  productStockSettingsSchema,
} from "@/features/products/schemas";
import type { Product } from "@/features/products/types";
import { useSupplierOptions } from "@/features/suppliers/hooks/use-supplier-options";
import { formatQuantity } from "@/lib/format";
import { toSelectFieldValue } from "@/lib/optional-select-value";

type ProductStockDialogProps = {
  organizationId: OrganizationId;
  product: Product | null;
  onClose: () => void;
};

function toFormValues(
  product: Product,
): DefaultValues<ProductStockSettingsInput> {
  return {
    isStockTracked: product.stockQuantity !== null,
    minimumStock: product.minimumStock || undefined,
    supplierId: toSelectFieldValue(product.supplierId),
    paymentDate: "",
  };
}

export function ProductStockDialog({
  organizationId,
  product,
  onClose,
}: ProductStockDialogProps) {
  const isOpen = product !== null;
  const updateMutation = useUpdateProductStockSettingsMutation(organizationId);
  const { supplierOptions, hasSuppliers } = useSupplierOptions(
    organizationId,
    isOpen,
  );
  const form = useForm<ProductStockSettingsInput>({
    resolver: zodResolver(productStockSettingsSchema),
  });
  const isStockTracked = useWatch({
    control: form.control,
    name: "isStockTracked",
  });
  const currentStock = product?.stockQuantity ?? null;

  useEffect(() => {
    if (!product) return;
    form.reset(toFormValues(product));
    updateMutation.reset();
  }, [product, form, updateMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!product) return;
    updateMutation.mutate(
      { productId: product.id, values },
      {
        onSuccess: () => {
          toast.success(
            values.isStockTracked && values.quantity
              ? "Entrada registrada."
              : "Estoque atualizado.",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={product ? `Estoque de ${product.name}` : "Estoque"}
      description="Para produtos prontos que você compra ou faz em lote, como bolos e bebidas."
      submitLabel="Salvar"
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <SwitchField
          control={form.control}
          name="isStockTracked"
          label="Controlar quantidade"
          description={
            currentStock === null
              ? "O PDV desconta a cada venda e esgota em 0."
              : `Em estoque agora: ${formatQuantity(currentStock)} un.`
          }
        />
        {isStockTracked && (
          <div className="grid items-start gap-5 sm:grid-cols-2">
            {currentStock !== null && (
              <div className="sm:col-span-2">
                <NumberField
                  control={form.control}
                  name="countedQuantity"
                  label="Corrigir estoque para"
                  description="Use quando sair produto sem lançar, como perda ou quebra."
                  format="integer"
                  suffix="un"
                  placeholder="Ex.: 0"
                />
              </div>
            )}
            <NumberField
              control={form.control}
              name="quantity"
              label="Quantidade comprada"
              format="integer"
              suffix="un"
              placeholder="Ex.: 12"
            />
            <NumberField
              control={form.control}
              name="minimumStock"
              label="Estoque mínimo (alerta)"
              format="integer"
              suffix="un"
              placeholder="Ex.: 3"
            />
            <NumberField
              control={form.control}
              name="totalCost"
              label="Valor pago"
              format="currency"
              placeholder="Ex.: $ 60,00"
            />
            <DateField
              control={form.control}
              name="paymentDate"
              label="Data de pagamento"
              placeholder="Escolha a data"
            />
            <div className="sm:col-span-2">
              <SelectField
                control={form.control}
                name="supplierId"
                label="Fornecedor"
                options={supplierOptions}
                description={
                  hasSuppliers
                    ? undefined
                    : "Cadastre fornecedores no módulo Fornecedores para vinculá-los."
                }
              />
            </div>
          </div>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
