import { useMutation } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { voidPunch } from "../actions";
import type { VoidPunchInput } from "../schemas";
import type { TimePunchId } from "../types";

import { useInvalidateTimesheets } from "./use-invalidate-timesheets";

export function getVoidPunchMutationKey(organizationId: OrganizationId) {
  return ["organizations", organizationId, "timesheets", "void-punch"] as const;
}

export function useVoidPunchMutation(organizationId: OrganizationId) {
  const invalidateTimesheets = useInvalidateTimesheets(organizationId);

  return useMutation({
    mutationKey: getVoidPunchMutationKey(organizationId),
    mutationFn: async ({
      punchId,
      input,
    }: {
      punchId: TimePunchId;
      input: VoidPunchInput;
    }) => unwrapActionResult(await voidPunch(organizationId, punchId, input)),
    onSuccess: invalidateTimesheets,
  });
}
