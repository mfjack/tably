import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { createDocument } from "../actions";
import {
  DOCUMENT_EXTENSIONS_BY_TYPE,
  getDocumentFileError,
  ORGANIZATION_DOCUMENTS_BUCKET,
} from "../document-files";
import type { DocumentFormInput } from "../schemas";
import { useInvalidateDocuments } from "./use-invalidate-documents";

type CreateDocumentVariables = {
  input: DocumentFormInput;
  file: File;
};

export function getCreateDocumentMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "documents", "create"] as const;
}

export function useCreateDocumentMutation(organizationId: OrganizationId) {
  const invalidateDocuments = useInvalidateDocuments(organizationId);

  return useMutation({
    mutationKey: getCreateDocumentMutationKey(organizationId),
    mutationFn: async ({ input, file }: CreateDocumentVariables) => {
      const fileError = getDocumentFileError(file);
      if (fileError) throw new Error(fileError);

      const filePath = `${organizationId}/${crypto.randomUUID()}.${DOCUMENT_EXTENSIONS_BY_TYPE[file.type]}`;
      const storage = (await loadBrowserClient()).storage.from(
        ORGANIZATION_DOCUMENTS_BUCKET,
      );
      const { error } = await storage.upload(filePath, file, {
        contentType: file.type,
      });
      if (error) throw new Error("Não foi possível enviar o arquivo.");

      const result = await createDocument(organizationId, input, {
        filePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (result.status === "error") await storage.remove([filePath]);
      return unwrapActionResult(result);
    },
    onSuccess: invalidateDocuments,
  });
}
