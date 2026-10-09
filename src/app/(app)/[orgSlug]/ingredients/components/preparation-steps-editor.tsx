"use client";

import { Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import type { PreparedRecipeFormInput } from "@/features/prepared-ingredients/schemas";

type PreparationStepsEditorProps = {
  control: Control<PreparedRecipeFormInput>;
};

export function PreparationStepsEditor({
  control,
}: PreparationStepsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "steps" });

  return (
    <FieldSet>
      <FieldLegend>Modo de preparo (opcional)</FieldLegend>
      <FieldDescription>
        Aparece na hora de produzir, para quem for fazer.
      </FieldDescription>
      <ol className="flex flex-col gap-2">
        {fields.map((stepField, index) => (
          <li
            key={stepField.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_2.25rem] items-start gap-2"
          >
            <span className="flex h-12 items-center justify-center font-semibold text-muted-foreground text-sm tabular-nums">
              {index + 1}.
            </span>
            <TextField
              control={control}
              name={`steps.${index}.text`}
              label={`Passo ${index + 1}`}
              isLabelHidden
              placeholder="Ex.: Derreta o açúcar com 50 ml da água"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="mt-1"
              aria-label={`Remover passo ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="h-10 self-start"
        onClick={() => append({ text: "" })}
      >
        <Plus aria-hidden />
        Adicionar passo
      </Button>
    </FieldSet>
  );
}
