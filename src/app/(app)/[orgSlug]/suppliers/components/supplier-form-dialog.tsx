"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/dialog/form-dialog";
import { MaskedField } from "@/components/form/masked-field";
import { TextField } from "@/components/form/text-field";
import { TextareaField } from "@/components/form/textarea-field";
import { FieldGroup } from "@/components/ui/field";
import type { OrganizationId } from "@/features/organizations/types";
import { useSaveSupplierMutation } from "@/features/suppliers/hooks/use-save-supplier-mutation";
import {
  type SupplierInput,
  supplierSchema,
} from "@/features/suppliers/schemas";
import type { Supplier } from "@/features/suppliers/types";

const EMPTY_SUPPLIER_FORM: SupplierInput = {
  name: "",
  contactName: "",
  phone: "",
  suppliedItems: "",
  purchaseUrl: "",
  notes: "",
};

type SupplierFormDialogProps = {
  organizationId: OrganizationId;
  isOpen: boolean;
  supplier?: Supplier;
  onClose: () => void;
};

function toFormValues(supplier: Supplier): SupplierInput {
  return {
    name: supplier.name,
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    suppliedItems: supplier.suppliedItems ?? "",
    purchaseUrl: supplier.purchaseUrl ?? "",
    notes: supplier.notes ?? "",
  };
}

export function SupplierFormDialog({
  organizationId,
  isOpen,
  supplier,
  onClose,
}: SupplierFormDialogProps) {
  const saveSupplierMutation = useSaveSupplierMutation(organizationId);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: EMPTY_SUPPLIER_FORM,
  });
  const isEditing = supplier !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    form.reset(supplier ? toFormValues(supplier) : EMPTY_SUPPLIER_FORM);
    saveSupplierMutation.reset();
  }, [isOpen, supplier, form, saveSupplierMutation.reset]);

  const handleSubmit = form.handleSubmit((values) =>
    saveSupplierMutation.mutate(
      { supplierId: supplier?.id ?? null, input: values },
      {
        onSuccess: () => {
          toast.success(
            isEditing ? "Fornecedor atualizado." : "Fornecedor cadastrado.",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    ),
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title={isEditing ? "Editar fornecedor" : "Novo fornecedor"}
      description="Quem vende os insumos para o seu negócio."
      submitLabel={isEditing ? "Salvar" : "Cadastrar"}
      isSubmitting={saveSupplierMutation.isPending}
      onSubmit={handleSubmit}
      size="large"
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Nome"
            placeholder="Ex.: Distribuidora Café Bom"
            autoComplete="organization"
          />
          <TextField
            control={form.control}
            name="contactName"
            label="Contato"
            placeholder="Ex.: Ana, vendedora"
            autoComplete="off"
          />
          <MaskedField
            control={form.control}
            name="phone"
            label="Telefone"
            mask="phone"
            placeholder="00 00000-0000"
            autoComplete="off"
          />
          <TextField
            control={form.control}
            name="suppliedItems"
            label="O que fornece"
            placeholder="Ex.: Café em grão, leite integral"
            autoComplete="off"
          />
        </div>
        <TextField
          control={form.control}
          name="purchaseUrl"
          label="Link de compra"
          type="url"
          placeholder="Ex.: link do produto no Mercado Livre"
          autoComplete="off"
        />
        <TextareaField
          control={form.control}
          name="notes"
          label="Observações"
          placeholder="Ex.: Entrega às terças, pedido mínimo de $ 200,00"
        />
      </FieldGroup>
    </FormDialog>
  );
}
