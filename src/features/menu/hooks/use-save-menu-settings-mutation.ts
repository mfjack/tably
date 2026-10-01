import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { updateMenuSettings } from "../actions";
import type { MenuSettingsInput } from "../schemas";

export function getSaveMenuSettingsMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "menu", "save"] as const;
}

export function useSaveMenuSettingsMutation(organizationId: OrganizationId) {
  const router = useRouter();

  return useMutation({
    mutationKey: getSaveMenuSettingsMutationKey(organizationId),
    mutationFn: async (input: MenuSettingsInput) =>
      unwrapActionResult(await updateMenuSettings(organizationId, input)),
    onSuccess: () => router.refresh(),
  });
}
