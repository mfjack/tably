import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { setFinancialEntryDocument } from "../actions";
import {
  DOCUMENT_EXTENSIONS_BY_TYPE,
  FINANCIAL_DOCUMENTS_BUCKET,
  getDocumentValidationError,
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
      const validationError = getDocumentValidationError(file);
      if (validationError) throw new Error(validationError);

      const filePath = `${organizationId}/${entryId}/${crypto.randomUUID()}.${DOCUMENT_EXTENSIONS_BY_TYPE[file.type]}`;
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
