import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { FINANCIAL_DOCUMENTS_BUCKET } from "../documents";

const SIGNED_URL_TTL_IN_SECONDS = 60;

export function getOpenFinancialDocumentMutationKey(
  organizationId: OrganizationId,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "documents",
    "open",
  ] as const;
}

export function useOpenFinancialDocumentMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getOpenFinancialDocumentMutationKey(organizationId),
    mutationFn: async (path: string) => {
      const supabase = await loadBrowserClient();
      const { data, error } = await supabase.storage
        .from(FINANCIAL_DOCUMENTS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_IN_SECONDS);

      if (error) throw new Error("Não foi possível abrir o arquivo.");
      return data.signedUrl;
    },
  });
}
