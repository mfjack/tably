"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { formatQuantity } from "@/lib/format";
import { useAddProductStockMutation } from "../hooks/use-add-product-stock-mutation";
import type { Product } from "../types";

const productStockEntrySchema = z.object({
  quantity: z
    .number({ error: "Informe a quantidade." })
    .int("Use um número inteiro.")
    .positive("A quantidade precisa ser maior que zero."),
});

type ProductStockEntryInput = z.infer<typeof productStockEntrySchema>;

type ProductStockEntryDialogProps = {
  organizationId: OrganizationId;
  product: Pick<Product, "id" | "name" | "stockQuantity"> | null;
  onClose: () => void;
};

export function ProductStockEntryDialog({
  organizationId,
  product,
  onClose,
}: ProductStockEntryDialogProps) {
  const addStockMutation = useAddProductStockMutation(organizationId);
  const form = useForm<ProductStockEntryInput>({
    resolver: zodResolver(productStockEntrySchema),
  });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const currentStock = product?.stockQuantity ?? 0;

  useEffect(() => {
    if (!product) return;
    form.reset({ quantity: undefined });
    addStockMutation.reset();
  }, [product, form, addStockMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!product) return;
    addStockMutation.mutate(
      { productId: product.id, quantity: values.quantity },
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
      description={`No estoque agora: ${formatQuantity(currentStock)} un. Some o que chegou ou foi feito.`}
      submitLabel="Registrar"
      isSubmitting={addStockMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
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
      </FieldGroup>
    </FormDialog>
  );
}
