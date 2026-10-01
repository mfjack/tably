"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { TextField } from "@/components/form/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useSaveCategoryMutation } from "@/features/categories/hooks/use-save-category-mutation";
import {
  type CategoryFormInput,
  categoryFormSchema,
} from "@/features/categories/schemas";
import type { Category } from "@/features/categories/types";
import type { OrganizationId } from "@/features/organizations/types";

const EMPTY_CATEGORY_FORM: CategoryFormInput = { name: "" };

type CategoryFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  category?: Category;
  onClose: () => void;
};

export function CategoryFormDialog({
  organizationId,
  isOpen,
  category,
  onClose,
}: CategoryFormDialogProps) {
  const saveCategoryMutation = useSaveCategoryMutation(organizationId);
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: EMPTY_CATEGORY_FORM,
  });
  const isEditing = Boolean(category);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(category ? { name: category.name } : EMPTY_CATEGORY_FORM);
    saveCategoryMutation.reset();
  }, [isOpen, category, form, saveCategoryMutation.reset]);

  const handleSubmit = form.handleSubmit((values) => {
    saveCategoryMutation.mutate(
      { categoryId: category?.id, values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Categoria atualizada." : "Categoria criada.",
          );
          onClose();
        },
        onError: (error) => form.setError("name", { message: error.message }),
      },
    );
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar categoria" : "Nova categoria"}
      description="O nome aparece como filtro no PDV."
      submitLabel={isEditing ? "Salvar" : "Criar categoria"}
      isSubmitting={saveCategoryMutation.isPending}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex.: Cafés"
          autoComplete="off"
        />
      </FieldGroup>
    </FormDialog>
  );
}
