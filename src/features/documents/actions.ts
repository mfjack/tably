"use server";

import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
  databaseFailure,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { ORGANIZATION_DOCUMENTS_BUCKET } from "./document-files";
import { type DocumentFormInput, documentFormSchema } from "./schemas";
import type {
  OrganizationDocument,
  OrganizationDocumentId,
  UploadedDocumentFile,
} from "./types";

const INVALID_FORM_MESSAGE = "Confira os campos e tente novamente.";
const SAVE_ERROR_MESSAGE = "Não foi possível salvar o documento.";

function toDocumentValues(input: DocumentFormInput) {
  return {
    name: input.name,
    kind: input.kind,
    expires_on: input.expiresOn || null,
    notes: input.notes || null,
  };
}

export async function listDocuments(
  organizationId: OrganizationId,
): Promise<ActionResult<OrganizationDocument[]>> {
  if (!(await hasModuleAccess(organizationId, "documents"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_documents")
    .select(
      "id, name, kind, file_path, file_name, mime_type, size_bytes, expires_on, notes, created_at",
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (error)
    return databaseFailure("Não foi possível carregar os documentos.", error);

  return actionSuccess(
    data.map((document) => ({
      id: document.id as OrganizationDocumentId,
      name: document.name,
      kind: document.kind,
      filePath: document.file_path,
      fileName: document.file_name,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      expiresOn: document.expires_on,
      notes: document.notes,
      createdAt: document.created_at,
    })),
  );
}

export async function createDocument(
  organizationId: OrganizationId,
  input: DocumentFormInput,
  file: UploadedDocumentFile,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "documents"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = documentFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);
  if (!file.filePath.startsWith(`${organizationId}/`)) {
    return actionFailure("Arquivo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_documents").insert({
    ...toDocumentValues(parsedInput.data),
    organization_id: organizationId,
    file_path: file.filePath,
    file_name: file.fileName,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
  });

  if (error) return databaseFailure(SAVE_ERROR_MESSAGE, error);
  return actionSuccess();
}

export async function updateDocument(
  organizationId: OrganizationId,
  documentId: OrganizationDocumentId,
  input: DocumentFormInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "documents"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const parsedInput = documentFormSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_documents")
    .update(toDocumentValues(parsedInput.data))
    .eq("id", documentId)
    .eq("organization_id", organizationId);

  if (error) return databaseFailure(SAVE_ERROR_MESSAGE, error);
  return actionSuccess();
}

export async function deleteDocument(
  organizationId: OrganizationId,
  documentId: OrganizationDocumentId,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "documents"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .select("file_path")
    .maybeSingle();

  if (error)
    return databaseFailure("Não foi possível excluir o documento.", error);
  if (data) {
    await supabase.storage
      .from(ORGANIZATION_DOCUMENTS_BUCKET)
      .remove([data.file_path]);
  }
  return actionSuccess();
}
