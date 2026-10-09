import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateDocument } from "../actions";
import type { DocumentFormInput } from "../schemas";
import type { OrganizationDocumentId } from "../types";
import { useInvalidateDocuments } from "./use-invalidate-documents";

type UpdateDocumentVariables = {
  documentId: OrganizationDocumentId;
  input: DocumentFormInput;
};

export function getUpdateDocumentMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "documents", "update"] as const;
}

export function useUpdateDocumentMutation(organizationId: OrganizationId) {
  const invalidateDocuments = useInvalidateDocuments(organizationId);

  return useMutation({
    mutationKey: getUpdateDocumentMutationKey(organizationId),
    mutationFn: async ({ documentId, input }: UpdateDocumentVariables) =>
      unwrapActionResult(
        await updateDocument(organizationId, documentId, input),
      ),
    onSuccess: invalidateDocuments,
  });
}
