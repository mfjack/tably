"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { CART_ITEM_NOTE_MAX_LENGTH } from "@/features/pos/cart-items";
import type { MenuCartLine } from "./menu-cart-item-card";

const itemNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(CART_ITEM_NOTE_MAX_LENGTH, "Observação muito longa."),
  isSingleUnit: z.boolean(),
});

type ItemNoteInput = z.infer<typeof itemNoteSchema>;

type MenuItemNoteDialogProps = {
  cartLine: MenuCartLine | null;
  onClose: () => void;
  onSave: (
    cartLine: MenuCartLine,
    note: string,
    quantityToMove: number,
  ) => void;
};

export function MenuItemNoteDialog({
  cartLine,
  onClose,
  onSave,
}: MenuItemNoteDialogProps) {
  const form = useForm<ItemNoteInput>({
    resolver: zodResolver(itemNoteSchema),
    defaultValues: { note: "", isSingleUnit: false },
  });
  const hasManyUnits = (cartLine?.quantity ?? 0) > 1;

  useEffect(() => {
    if (cartLine) form.reset({ note: cartLine.note, isSingleUnit: false });
  }, [cartLine, form]);

  const handleSubmit = form.handleSubmit(({ note, isSingleUnit }) => {
    if (!cartLine) return;
    onSave(cartLine, note, isSingleUnit ? 1 : cartLine.quantity);
    onClose();
  });

  return (
    <FormDialog
      isOpen={cartLine !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={cartLine ? `Observação: ${cartLine.name}` : "Observação do item"}
      description="Vai junto com o pedido para a cozinha."
      submitLabel="Salvar"
      isSubmitting={false}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="note"
          label="Observação"
          placeholder="Ex.: sem açúcar, leite vegetal"
          autoComplete="off"
        />
        {hasManyUnits && (
          <SwitchField
            control={form.control}
            name="isSingleUnit"
            label="Só em 1 unidade"
            description={`Desligado, vale para as ${cartLine?.quantity} unidades.`}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
