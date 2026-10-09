"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Control, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { DateField } from "@/components/form/date-field";
import { NumberField } from "@/components/form/number-field";
import { FieldGroup } from "@/components/ui/field";
import {
  describeStockEquivalent,
  formatPackageCount,
  getQuantitySuffix,
  hasPackage,
  toPackageQuantity,
  toStockQuantity,
} from "@/features/ingredients/packages";
import { formatItemQuantity } from "@/features/ingredients/shopping-list";
import type { OrganizationId } from "@/features/organizations/types";
import { useReceivePurchaseOrderMutation } from "@/features/purchase-orders/hooks/use-receive-purchase-order-mutation";
import {
  type ReceivePurchaseOrderFormInput,
  receivePurchaseOrderFormSchema,
} from "@/features/purchase-orders/schemas";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/features/purchase-orders/types";
import { formatCurrency } from "@/lib/format";

const CENTS_PER_UNIT = 100;

type ReceivePurchaseOrderDialogProps = {
  organizationId: OrganizationId;
  order: PurchaseOrder;
  onClose: () => void;
};

function estimateCost(item: PurchaseOrderItem, typedQuantity: number): number {
  const stockQuantity = toStockQuantity(item, typedQuantity);
  return (
    Math.round(stockQuantity * item.unitCost * CENTS_PER_UNIT) / CENTS_PER_UNIT
  );
}

function getItemCost(
  item: PurchaseOrderItem,
  quantity: number | undefined,
  totalCost: number | undefined,
): number {
  return totalCost ?? estimateCost(item, quantity ?? 0);
}

type ReceiveItemFieldsProps = {
  control: Control<ReceivePurchaseOrderFormInput>;
  index: number;
  item: PurchaseOrderItem;
};

function ReceiveItemFields({ control, index, item }: ReceiveItemFieldsProps) {
  const quantity = useWatch({ control, name: `items.${index}.quantity` });

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-sm">{item.ingredientName}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          Pedido:{" "}
          {hasPackage(item)
            ? formatPackageCount(
                toPackageQuantity(item, item.quantity),
                item.packageName,
              )
            : formatItemQuantity(item.quantity, item.unit)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          control={control}
          name={`items.${index}.quantity`}
          label="Chegou"
          format="quantity"
          suffix={getQuantitySuffix(item, quantity)}
          placeholder="0 se não veio"
          description={describeStockEquivalent(item, quantity)}
          size="compact"
        />
        <NumberField
          control={control}
          name={`items.${index}.totalCost`}
          label="Valor pago"
          format="currency"
          placeholder={`Estimado: ${formatCurrency(estimateCost(item, quantity ?? 0))}`}
          size="compact"
        />
      </div>
    </li>
  );
}

export function ReceivePurchaseOrderDialog({
  organizationId,
  order,
  onClose,
}: ReceivePurchaseOrderDialogProps) {
  const receiveMutation = useReceivePurchaseOrderMutation(organizationId);
  const form = useForm<ReceivePurchaseOrderFormInput>({
    resolver: zodResolver(receivePurchaseOrderFormSchema),
    defaultValues: {
      items: order.items.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: toPackageQuantity(item, item.quantity),
        totalCost: undefined,
      })),
      paymentDueDate: "",
    },
  });
  const items = useWatch({ control: form.control, name: "items" });
  const total = order.items.reduce(
    (sum, item, index) =>
      sum +
      getItemCost(item, items?.[index]?.quantity, items?.[index]?.totalCost),
    0,
  );

  const handleSubmit = form.handleSubmit((values) =>
    receiveMutation.mutate(
      {
        orderId: order.id,
        input: {
          items: order.items.map((item, index) => {
            const quantity = values.items[index]?.quantity ?? 0;
            return {
              ingredientId: item.ingredientId,
              quantity: toStockQuantity(item, quantity),
              totalCost: getItemCost(
                item,
                quantity,
                values.items[index]?.totalCost,
              ),
            };
          }),
          paymentDueDate: values.paymentDueDate,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pedido recebido.", {
            description: values.paymentDueDate
              ? "Estoque atualizado e conta a pagar lançada."
              : "Estoque atualizado.",
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
      title={`Receber pedido${order.supplierName ? ` · ${order.supplierName}` : ""}`}
      description="Confira o que chegou. As quantidades já vêm do pedido; ajuste o que veio diferente. Sem valor pago, usamos o custo atual do insumo."
      submitLabel="Dar entrada"
      isSubmitting={receiveMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <ul className="flex flex-col divide-y rounded-xl border">
          {order.items.map((item, index) => (
            <ReceiveItemFields
              key={item.ingredientId}
              control={form.control}
              index={index}
              item={item}
            />
          ))}
        </ul>
        <div className="flex items-baseline justify-between rounded-xl bg-muted/50 px-4 py-3">
          <span className="text-muted-foreground text-sm">Total da compra</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
        <DateField
          control={form.control}
          name="paymentDueDate"
          label="Vencimento da conta (opcional)"
          description="Preencha para lançar o total em Contas a pagar."
          placeholder="Escolha a data"
        />
      </FieldGroup>
    </FormDialog>
  );
}
