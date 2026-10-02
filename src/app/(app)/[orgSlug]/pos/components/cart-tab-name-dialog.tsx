"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useCheckCustomerNameMutation } from "@/features/orders/hooks/use-check-customer-name-mutation";
import { CUSTOMER_NAME_IN_USE_MESSAGE } from "@/features/orders/messages";
import type { OrganizationId } from "@/features/organizations/types";
import { CART_TAB_NAME_MAX_LENGTH } from "@/features/pos/cart-store";

const cartTabNameSchema = z.object({
  name: z.string().trim().max(CART_TAB_NAME_MAX_LENGTH, "Nome muito longo."),
});

type CartTabNameInput = z.infer<typeof cartTabNameSchema>;

export type CartTabNameDialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "rename"; currentName: string };

type CartTabNameDialogProps = {
  state: CartTabNameDialogState;
  organizationId: OrganizationId;
  otherTabNames: readonly string[];
  onClose: () => void;
  onSubmit: (name: string) => void;
};

const DUPLICATE_TAB_NAME_MESSAGE = "Já existe um pedido com esse nome.";

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR");
}

export function CartTabNameDialog({
  state,
  organizationId,
  otherTabNames,
  onClose,
  onSubmit,
}: CartTabNameDialogProps) {
  const checkCustomerNameMutation =
    useCheckCustomerNameMutation(organizationId);
  const form = useForm<CartTabNameInput>({
    resolver: zodResolver(cartTabNameSchema),
    defaultValues: { name: "" },
  });
  const isRenaming = state.mode === "rename";

  useEffect(() => {
    if (state.mode === "closed") return;
    form.reset({ name: state.mode === "rename" ? state.currentName : "" });
    checkCustomerNameMutation.reset();
  }, [state, form, checkCustomerNameMutation.reset]);

  function saveName(name: string) {
    onSubmit(name);
    onClose();
  }

  const handleSubmit = form.handleSubmit(({ name }) => {
    if (!name) {
      saveName(name);
      return;
    }

    const isDuplicateTab = otherTabNames.some(
      (otherName) => normalizeName(otherName) === normalizeName(name),
    );
    if (isDuplicateTab) {
      form.setError("name", { message: DUPLICATE_TAB_NAME_MESSAGE });
      return;
    }

    if (
      state.mode === "rename" &&
      normalizeName(state.currentName) === normalizeName(name)
    ) {
      saveName(name);
      return;
    }

    checkCustomerNameMutation.mutate(name, {
      onSuccess: (isAvailable) => {
        if (isAvailable) {
          saveName(name);
          return;
        }
        form.setError("name", { message: CUSTOMER_NAME_IN_USE_MESSAGE });
      },
      onError: (error) => form.setError("name", { message: error.message }),
    });
  });

  return (
    <FormDialog
      isOpen={state.mode !== "closed"}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isRenaming ? "Nome do pedido" : "Novo pedido"}
      description="O nome aparece na aba e já vem preenchido na hora de imprimir ou criar a comanda."
      submitLabel={isRenaming ? "Salvar" : "Criar pedido"}
      isSubmitting={checkCustomerNameMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome do cliente (opcional)"
          placeholder="Ex.: Diego"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
