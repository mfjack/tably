"use client";

import { Plus, Truck } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { OrganizationId } from "@/features/organizations/types";
import { useDeleteSupplierMutation } from "@/features/suppliers/hooks/use-delete-supplier-mutation";
import { useSuppliersQuery } from "@/features/suppliers/hooks/use-suppliers-query";
import type { Supplier } from "@/features/suppliers/types";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { SupplierPurchasesDialog } from "./supplier-purchases-dialog";
import { SuppliersTable } from "./suppliers-table";

type SupplierFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; supplier: Supplier };

type SuppliersViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
};

export function SuppliersView({
  organizationId,
  title,
  description,
  canManage,
}: SuppliersViewProps) {
  const suppliersQuery = useSuppliersQuery(organizationId);
  const deleteSupplierMutation = useDeleteSupplierMutation(organizationId);
  const [formState, setFormState] = useState<SupplierFormState>({
    mode: "closed",
  });
  const [purchasesSupplier, setPurchasesSupplier] = useState<Supplier | null>(
    null,
  );
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((supplier: Supplier) => {
    setFormState({ mode: "edit", supplier });
  }, []);

  function confirmDelete() {
    if (!supplierToDelete) return;
    deleteSupplierMutation.mutate(supplierToDelete.id, {
      onSuccess: () => {
        toast.success(`${supplierToDelete.name} excluído.`);
        setSupplierToDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          canManage && (
            <Button className="h-10" onClick={openCreateForm}>
              <Plus aria-hidden />
              Novo fornecedor
            </Button>
          )
        }
      />
      <PageContent>
        <SuppliersTable
          suppliers={suppliersQuery.data}
          isLoading={suppliersQuery.isPending}
          errorMessage={suppliersQuery.error?.message}
          canManage={canManage}
          emptyState={
            <ListEmptyState
              icon={Truck}
              title="Nenhum fornecedor ainda"
              description="Cadastre quem vende seus insumos para registrar as compras e falar com eles pelo WhatsApp."
              createLabel="Cadastrar primeiro fornecedor"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onOpenPurchases={setPurchasesSupplier}
          onEdit={openEditForm}
          onDelete={setSupplierToDelete}
        />
      </PageContent>

      <SupplierFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        supplier={formState.mode === "edit" ? formState.supplier : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <SupplierPurchasesDialog
        organizationId={organizationId}
        supplier={purchasesSupplier}
        onClose={() => setPurchasesSupplier(null)}
      />
      <ConfirmDialog
        isOpen={supplierToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setSupplierToDelete(null)}
        title="Excluir fornecedor?"
        description={`${supplierToDelete?.name ?? ""} sai da lista. As entradas de insumos já registradas continuam, só ficam sem fornecedor.`}
        confirmLabel="Excluir"
        isConfirming={deleteSupplierMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
