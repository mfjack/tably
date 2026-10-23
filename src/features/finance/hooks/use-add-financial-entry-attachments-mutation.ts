import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { buildDocumentPath, getDocumentFileError } from "@/lib/document-files";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { addFinancialEntryAttachments } from "../actions";
import {
  FINANCIAL_DOCUMENTS_BUCKET,
  MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES,
} from "../documents";
import type { FinancialEntryId } from "../types";
import { useInvalidateFinance } from "./use-invalidate-finance";

type AddFinancialEntryAttachmentsVariables = {
  entryId: FinancialEntryId;
  files: readonly File[];
};

export function getAddFinancialEntryAttachmentsMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "attachments",
    "add",
  ] as const;
}

export function useAddFinancialEntryAttachmentsMutation(
  organizationId: OrganizationId,
) {
  const invalidateFinance = useInvalidateFinance(organizationId);

  return useMutation({
    mutationKey: getAddFinancialEntryAttachmentsMutationKey(organizationId),
    mutationFn: async ({
      entryId,
      files,
    }: AddFinancialEntryAttachmentsVariables) => {
      const validationError = files
        .map((file) =>
          getDocumentFileError(file, MAX_FINANCIAL_DOCUMENT_SIZE_IN_MEGABYTES),
        )
        .find((error) => error !== null);
      if (validationError) throw new Error(validationError);

      const supabase = await loadBrowserClient();
      const storage = supabase.storage.from(FINANCIAL_DOCUMENTS_BUCKET);
      const uploads = await Promise.all(
        files.map(async (file) => {
          const path = buildDocumentPath(`${organizationId}/${entryId}`, file);
          const { error } = await storage.upload(path, file, {
            contentType: file.type,
          });
          return { path, fileName: file.name, isUploaded: !error };
        }),
      );

      const uploaded = uploads.filter((upload) => upload.isUploaded);
      if (uploaded.length < uploads.length) {
        if (uploaded.length > 0) {
          await storage.remove(uploaded.map((upload) => upload.path));
        }
        throw new Error("Não foi possível enviar os arquivos.");
      }

      return unwrapActionResult(
        await addFinancialEntryAttachments(
          organizationId,
          entryId,
          uploaded.map(({ path, fileName }) => ({ path, fileName })),
        ),
      );
    },
    onSuccess: invalidateFinance,
  });
}
