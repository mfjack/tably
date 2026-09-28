import { useMutation } from "@tanstack/react-query";
import { unwrapActionResult } from "@/lib/action-result";
import { createOrganization } from "../actions";
import type { CreateOrganizationInput } from "../schemas";

export function getCreateOrganizationMutationKey() {
  return ["organizations", "create"] as const;
}

export function useCreateOrganizationMutation() {
  return useMutation({
    mutationKey: getCreateOrganizationMutationKey(),
    mutationFn: async (values: CreateOrganizationInput) =>
      unwrapActionResult(await createOrganization(values)),
  });
}
