"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useCheckCustomerNameMutation } from "@/features/orders/hooks/use-check-customer-name-mutation";
import { CUSTOMER_NAME_IN_USE_MESSAGE } from "@/features/orders/messages";
import type { OrganizationId } from "@/features/organizations/types";
import type { CartTabId } from "@/features/pos/cart-store";
import { formatCurrency } from "@/lib/format";
import type { GroupCheckoutMode } from "../hooks/use-group-checkout";

export type GroupOrderEntry = {
  cartTabId: CartTabId;
  label: string;
  defaultName: string;
  itemCount: number;
  total: number;
};

const groupOrdersSchema = z
  .object({
    orders: z.array(
      z.object({
        customerName: z
          .string()
          .trim()
          .min(1, "Informe o nome.")
          .max(60, "Nome muito longo."),
      }),
    ),
  })
  .superRefine(({ orders }, context) => {
    const seenNames = new Set<string>();
    orders.forEach((order, index) => {
      const normalizedName = order.customerName
        .trim()
        .toLocaleLowerCase("pt-BR");
      if (normalizedName && seenNames.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          message: "Use um nome diferente para cada pedido.",
          path: ["orders", index, "customerName"],
        });
      }
      seenNames.add(normalizedName);
    });
  });

type GroupOrdersInput = z.infer<typeof groupOrdersSchema>;

type GroupOrdersDialogProps = {
  organizationId: OrganizationId;
  mode: GroupCheckoutMode;
  entries: readonly GroupOrderEntry[];
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (names: readonly string[]) => void;
};

const NAME_CHECK_FAILED_MESSAGE = "Não foi possível verificar os nomes.";

function formatItemCount(count: number) {
  return count === 1 ? "1 item" : `${count} itens`;
}

const GROUP_DIALOG_COPY = {
  kitchen: {
    title: "Imprimir todos os pedidos",
    description:
      "Depois você recebe o pagamento de cada pessoa ou abre a comanda dela. O ticket sai junto no final, separado por nome.",
  },
  payment: {
    title: "Pagamento de todos os pedidos",
    description:
      "Depois você recebe o pagamento de cada pessoa ou cria a comanda dela.",
  },
} as const satisfies Record<
  GroupCheckoutMode,
  { title: string; description: string }
>;

export function GroupOrdersDialog({
  organizationId,
  mode,
  entries,
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
}: GroupOrdersDialogProps) {
  const form = useForm<GroupOrdersInput>({
    resolver: zodResolver(groupOrdersSchema),
    defaultValues: { orders: [] },
  });
  const { fields } = useFieldArray({ control: form.control, name: "orders" });
  const [isCheckingNames, setIsCheckingNames] = useState(false);
  const { mutateAsync: checkCustomerName } =
    useCheckCustomerNameMutation(organizationId);
  const grandTotal = entries.reduce((total, entry) => total + entry.total, 0);
  const entriesKey = entries
    .map((entry) => `${entry.cartTabId}:${entry.defaultName}`)
    .join("|");

  useEffect(() => {
    if (!isOpen || !entriesKey) return;
    form.reset({
      orders: entriesKey.split("|").map((entryKey) => ({
        customerName: entryKey.slice(entryKey.indexOf(":") + 1),
      })),
    });
  }, [isOpen, entriesKey, form]);

  const handleSubmit = form.handleSubmit(async ({ orders }) => {
    const names = orders.map((order) => order.customerName.trim());
    setIsCheckingNames(true);

    try {
      const availability = await Promise.all(
        names.map((name) => checkCustomerName(name)),
      );
      const unavailableIndexes = availability.flatMap((isAvailable, index) =>
        isAvailable ? [] : [index],
      );

      for (const index of unavailableIndexes) {
        form.setError(`orders.${index}.customerName`, {
          message: CUSTOMER_NAME_IN_USE_MESSAGE,
        });
      }

      if (unavailableIndexes.length === 0) onConfirm(names);
    } catch (error) {
      form.setError("orders.0.customerName", {
        message:
          error instanceof Error ? error.message : NAME_CHECK_FAILED_MESSAGE,
      });
    } finally {
      setIsCheckingNames(false);
    }
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={GROUP_DIALOG_COPY[mode].title}
      description={GROUP_DIALOG_COPY[mode].description}
      submitLabel="Ir para pagamento"
      isSubmitting={isSubmitting || isCheckingNames}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        {fields.map((field, index) => {
          const entry = entries[index];
          if (!entry) return null;
          return (
            <div
              key={field.id}
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{entry.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatItemCount(entry.itemCount)} ·{" "}
                  {formatCurrency(entry.total)}
                </span>
              </div>
              <TextField
                control={form.control}
                name={`orders.${index}.customerName`}
                label="Nome do cliente"
                placeholder="Ex.: Diego"
                autoComplete="off"
              />
            </div>
          );
        })}
        <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
          <span className="text-muted-foreground text-sm">Total geral</span>
          <span className="font-bold text-lg tabular-nums">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
