import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { unwrapActionResult } from "@/lib/action-result";
import { clearOfflineCaches } from "@/lib/offline-cache";
import { ROUTES } from "@/lib/routes";
import { deleteMyAccount } from "../actions";
import type { DeleteAccountInput } from "../schemas";

export function getDeleteAccountMutationKey() {
  return ["profile", "delete-account"] as const;
}

export function useDeleteAccountMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteAccountMutationKey(),
    mutationFn: async (input: DeleteAccountInput) =>
      unwrapActionResult(await deleteMyAccount(input)),
    onSuccess: async () => {
      queryClient.clear();
      await clearOfflineCaches();
      router.replace(ROUTES.login);
      router.refresh();
    },
  });
}
