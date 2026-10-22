import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { unwrapActionResult } from "@/lib/action-result";
import { clearOfflineCaches } from "@/lib/offline-cache";
import { ROUTES } from "@/lib/routes";
import { signOut } from "../actions";

export function getSignOutMutationKey() {
  return ["auth", "sign-out"] as const;
}

export function useSignOutMutation(redirectPath: string = ROUTES.login) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSignOutMutationKey(),
    mutationFn: async () => unwrapActionResult(await signOut()),
    onSuccess: async () => {
      queryClient.clear();
      await clearOfflineCaches();
      router.replace(redirectPath);
      router.refresh();
    },
  });
}
