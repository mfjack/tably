import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { buildDocumentPath, getDocumentFileError } from "@/lib/document-files";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { setFinancialEntryDocument } from "../actions";
import {
  FINANCIAL_DOCUMENTS_BUCKET,
  MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES,
} from "../documents";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

type UploadFinancialDocumentVariables = {
  entryId: FinancialEntryId;
  field: "document" | "receipt";
  file: File;
};

export function getUploadFinancialDocumentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "documents",
    "upload",
  ] as const;
}

export function useUploadFinancialDocumentMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getUploadFinancialDocumentMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      field,
      file,
    }: UploadFinancialDocumentVariables) => {
      const validationError = getDocumentFileError(
        file,
        MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES,
      );
      if (validationError) throw new Error(validationError);

      const filePath = buildDocumentPath(`${organizationId}/${entryId}`, file);
      const supabase = await loadBrowserClient();
      const { error } = await supabase.storage
        .from(FINANCIAL_DOCUMENTS_BUCKET)
        .upload(filePath, file, { contentType: file.type });

      if (error) throw new Error("Não foi possível enviar o arquivo.");

      return unwrapActionResult(
        await setFinancialEntryDocument(
          organizationId,
          entryId,
          field,
          filePath,
        ),
      );
    },
    onSuccess: invalidateFinance,
  });
}
