"use client";

import { FolderOpen, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dialog/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteDocumentMutation } from "@/features/documents/hooks/use-delete-document-mutation";
import { useDocumentsQuery } from "@/features/documents/hooks/use-documents-query";
import { useOpenDocumentMutation } from "@/features/documents/hooks/use-open-document-mutation";
import type { OrganizationDocument } from "@/features/documents/types";
import type { OrganizationId } from "@/features/organizations/types";
import { openPendingTab } from "@/lib/open-in-new-tab";
import { ListEmptyState } from "../../components/list-empty-state";
import { PageContent } from "../../components/page-content";
import { PageHeader } from "../../components/page-header";
import { DocumentFormDialog } from "./document-form-dialog";
import { DocumentsTable } from "./documents-table";

type DocumentFormState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; document: OrganizationDocument };

type DocumentsViewProps = {
  organizationId: OrganizationId;
  title: string;
  description: string;
  canManage: boolean;
};

export function DocumentsView({
  organizationId,
  title,
  description,
  canManage,
}: DocumentsViewProps) {
  const documentsQuery = useDocumentsQuery(organizationId);
  const deleteMutation = useDeleteDocumentMutation(organizationId);
  const openMutation = useOpenDocumentMutation(organizationId);
  const [formState, setFormState] = useState<DocumentFormState>({
    mode: "closed",
  });
  const [documentToDelete, setDocumentToDelete] =
    useState<OrganizationDocument | null>(null);

  const openCreateForm = useCallback(() => {
    setFormState({ mode: "create" });
  }, []);

  const openEditForm = useCallback((document: OrganizationDocument) => {
    setFormState({ mode: "edit", document });
  }, []);

  const { mutate: openFile } = openMutation;
  const openDocument = useCallback(
    (document: OrganizationDocument) => {
      const pendingTab = openPendingTab();
      openFile(document.filePath, {
        onSuccess: pendingTab.navigate,
        onError: (error) => {
          pendingTab.close();
          toast.error(error.message);
        },
      });
    },
    [openFile],
  );

  function confirmDelete() {
    if (!documentToDelete) return;
    deleteMutation.mutate(documentToDelete.id, {
      onSuccess: () => {
        toast.success(`${documentToDelete.name} excluído.`);
        setDocumentToDelete(null);
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
              Novo documento
            </Button>
          )
        }
      />
      <PageContent>
        <DocumentsTable
          documents={documentsQuery.data}
          isLoading={documentsQuery.isPending}
          errorMessage={documentsQuery.error?.message}
          canManage={canManage}
          emptyState={
            <ListEmptyState
              icon={FolderOpen}
              title="Nenhum documento guardado"
              description="Guarde contrato social, alvará, licenças e contratos. Com a validade, o Tably avisa antes de vencer."
              createLabel="Guardar primeiro documento"
              canCreate={canManage}
              onCreate={openCreateForm}
            />
          }
          onOpen={openDocument}
          onEdit={openEditForm}
          onDelete={setDocumentToDelete}
        />
      </PageContent>

      <DocumentFormDialog
        organizationId={organizationId}
        isOpen={formState.mode !== "closed"}
        document={formState.mode === "edit" ? formState.document : undefined}
        onClose={() => setFormState({ mode: "closed" })}
      />
      <ConfirmDialog
        isOpen={documentToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setDocumentToDelete(null)}
        title="Excluir documento?"
        description={`${documentToDelete?.name ?? ""} e o arquivo dele serão apagados. Isso não pode ser desfeito.`}
        confirmLabel="Excluir"
        isConfirming={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
