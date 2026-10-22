"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { FormDialog } from "@/components/dialog/form-dialog";
import { SwitchField } from "@/components/form/switch-field";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { ORDER_ITEM_NOTE_MAX_LENGTH } from "@/features/orders/schemas";

const itemNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(ORDER_ITEM_NOTE_MAX_LENGTH, "Observação muito longa."),
  isSingleUnit: z.boolean(),
});

type ItemNoteInput = z.infer<typeof itemNoteSchema>;

type NoteLine = {
  quantity: number;
  note: string;
};

type ItemNoteDialogProps<TLine extends NoteLine> = {
  line: TLine | null;
  itemName: string;
  description: string;
  placeholder: string;
  onClose: () => void;
  onSave: (line: TLine, note: string, quantityToMove: number) => void;
};

export function ItemNoteDialog<TLine extends NoteLine>({
  line,
  itemName,
  description,
  placeholder,
  onClose,
  onSave,
}: ItemNoteDialogProps<TLine>) {
  const form = useForm<ItemNoteInput>({
    resolver: zodResolver(itemNoteSchema),
    defaultValues: { note: "", isSingleUnit: false },
  });
  const hasManyUnits = (line?.quantity ?? 0) > 1;

  useEffect(() => {
    if (line) form.reset({ note: line.note, isSingleUnit: false });
  }, [line, form]);

  const handleSubmit = form.handleSubmit(({ note, isSingleUnit }) => {
    if (!line) return;
    onSave(line, note, isSingleUnit ? 1 : line.quantity);
    onClose();
  });

  return (
    <FormDialog
      isOpen={line !== null}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={line ? `Observação: ${itemName}` : "Observação do item"}
      description={description}
      submitLabel="Salvar"
      isSubmitting={false}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="note"
          label="Observação"
          placeholder={placeholder}
          autoComplete="off"
        />
        {hasManyUnits && (
          <SwitchField
            control={form.control}
            name="isSingleUnit"
            label="Só em 1 unidade"
            description={`Desligado, vale para as ${line?.quantity} unidades.`}
          />
        )}
      </FieldGroup>
    </FormDialog>
  );
}
