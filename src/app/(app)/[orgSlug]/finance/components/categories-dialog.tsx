"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteFinancialCategoryMutation } from "@/features/finance/hooks/use-delete-financial-category-mutation";
import { useSaveFinancialCategoryMutation } from "@/features/finance/hooks/use-save-financial-category-mutation";
import { ENTRY_KIND_LABELS } from "@/features/finance/labels";
import { type CategoryInput, categorySchema } from "@/features/finance/schemas";
import type {
  FinancialCategory,
  FinancialEntryKind,
} from "@/features/finance/types";
import type { OrganizationId } from "@/features/organizations/types";

const KIND_OPTIONS = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
] as const;

const SECTIONS = [
  { kind: "expense", title: "Despesas" },
  { kind: "income", title: "Receitas" },
] as const satisfies readonly { kind: FinancialEntryKind; title: string }[];

type CategoriesDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  categories: readonly FinancialCategory[];
  onClose: () => void;
};

export function CategoriesDialog({
  organizationId,
  isOpen,
  categories,
  onClose,
}: CategoriesDialogProps) {
  const saveMutation = useSaveFinancialCategoryMutation(organizationId);
  const deleteMutation = useDeleteFinancialCategoryMutation(organizationId);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", kind: "expense" },
  });

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate(
      { categoryId: null, input: values },
      {
        onSuccess: () => {
          toast.success(
            `Categoria de ${ENTRY_KIND_LABELS[values.kind].toLowerCase()} criada.`,
          );
          form.reset({ name: "", kind: values.kind });
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Categorias"
      footer={
        <DialogClose
          render={
            <Button
              variant="outline"
              className={`${DIALOG_ACTION_BUTTON_CLASS_NAME} col-span-2`}
            />
          }
        >
          Fechar
        </DialogClose>
      }
    >
      <div className="flex flex-col gap-5">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-[1fr_8rem_auto] items-start gap-2"
        >
          <TextField
            control={form.control}
            name="name"
            label="Nome da categoria"
            isLabelHidden
            placeholder="Ex.: Delivery"
            autoComplete="off"
          />
          <SelectField
            control={form.control}
            name="kind"
            label="Tipo"
            isLabelHidden
            options={KIND_OPTIONS}
          />
          <Button
            type="submit"
            size="icon"
            className="size-12"
            aria-label="Adicionar categoria"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Spinner aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
          </Button>
        </form>

        {SECTIONS.map((section) => (
          <section key={section.kind} className="flex flex-col gap-2">
            <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              {section.title}
            </h3>
            <ul className="flex flex-col divide-y rounded-xl border">
              {categories
                .filter((category) => category.kind === section.kind)
                .map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {category.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Excluir ${category.name}`}
                      className="text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        deleteMutation.mutate(category.id, {
                          onError: (error) => toast.error(error.message),
                        })
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        <p className="text-muted-foreground text-xs">
          Ao excluir uma categoria, os lançamentos dela continuam, só ficam sem
          categoria.
        </p>
      </div>
    </DetailsDialog>
  );
}
