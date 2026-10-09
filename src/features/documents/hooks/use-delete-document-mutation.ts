import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteDocument } from "../actions";
import type { OrganizationDocumentId } from "../types";
import { useInvalidateDocuments } from "./use-invalidate-documents";

export function getDeleteDocumentMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "documents", "delete"] as const;
}

export function useDeleteDocumentMutation(organizationId: OrganizationId) {
  const invalidateDocuments = useInvalidateDocuments(organizationId);

  return useMutation({
    mutationKey: getDeleteDocumentMutationKey(organizationId),
    mutationFn: async (documentId: OrganizationDocumentId) =>
      unwrapActionResult(await deleteDocument(organizationId, documentId)),
    onSuccess: invalidateDocuments,
  });
}
