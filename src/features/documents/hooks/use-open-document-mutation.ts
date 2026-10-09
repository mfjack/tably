import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { loadBrowserClient } from "@/lib/supabase/load-browser-client";
import { ORGANIZATION_DOCUMENTS_BUCKET } from "../document-files";

const SIGNED_URL_TTL_IN_SECONDS = 60;

export function getOpenDocumentMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "documents", "open"] as const;
}

export function useOpenDocumentMutation(organizationId: OrganizationId) {
  return useMutation({
    mutationKey: getOpenDocumentMutationKey(organizationId),
    mutationFn: async (filePath: string) => {
      const supabase = await loadBrowserClient();
      const { data, error } = await supabase.storage
        .from(ORGANIZATION_DOCUMENTS_BUCKET)
        .createSignedUrl(filePath, SIGNED_URL_TTL_IN_SECONDS);

      if (error) throw new Error("Não foi possível abrir o arquivo.");
      return data.signedUrl;
    },
  });
}
