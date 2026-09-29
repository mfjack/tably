import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { updateOrganizationModules } from "../actions";
import type { OrganizationModulesInput } from "../schemas";
import type { OrganizationId } from "../types";

export function getUpdateOrganizationModulesMutationKey(
  organizationId: OrganizationId,
) {
  return ["organizations", organizationId, "update-modules"] as const;
}

export function useUpdateOrganizationModulesMutation(
  organizationId: OrganizationId,
) {
  return useMutation({
    mutationKey: getUpdateOrganizationModulesMutationKey(organizationId),
    mutationFn: async (input: OrganizationModulesInput) =>
      unwrapActionResult(
        await updateOrganizationModules(organizationId, input),
      ),
  });
}
