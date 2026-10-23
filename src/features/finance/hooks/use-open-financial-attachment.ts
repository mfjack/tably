import { useCallback } from "react";
import { toast } from "sonner";
import type { OrganizationId } from "@/features/organizations/types";
import { openPendingTab } from "@/lib/open-in-new-tab";
import { useOpenFinancialDocumentMutation } from "./use-open-financial-document-mutation";

export function useOpenFinancialAttachment(organizationId: OrganizationId) {
  const { mutate } = useOpenFinancialDocumentMutation(organizationId);

  return useCallback(
    (path: string) => {
      const pendingTab = openPendingTab();
      mutate(path, {
        onSuccess: pendingTab.navigate,
        onError: (error) => {
          pendingTab.close();
          toast.error(error.message);
        },
      });
    },
    [mutate],
  );
}
