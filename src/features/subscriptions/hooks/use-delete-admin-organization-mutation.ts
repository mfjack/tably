import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { DeleteAccountInput } from "@/features/auth/schemas";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { deleteAdminOrganization } from "../actions";

type DeleteAdminOrganizationVariables = {
  organizationId: OrganizationId;
  input: DeleteAccountInput;
};

export function getDeleteAdminOrganizationMutationKey() {
  return ["admin", "organizations", "delete"] as const;
}

export function useDeleteAdminOrganizationMutation() {
  const router = useRouter();

  return useMutation({
    mutationKey: getDeleteAdminOrganizationMutationKey(),
    mutationFn: async ({
      organizationId,
      input,
    }: DeleteAdminOrganizationVariables) =>
      unwrapActionResult(await deleteAdminOrganization(organizationId, input)),
    networkMode: "online",
    onSuccess: () => router.refresh(),
  });
}
