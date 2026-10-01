import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionData,
  fetchActionResult,
} from "@/lib/api/fetch-action-result";
import { organizationApiPath } from "@/lib/api/organization-api-path";
import type { listFinancialEntries } from "../actions";
import type { EntryListFilter } from "../schemas";
import type { FinancialEntryKind } from "../types";

export function getFinancialEntriesQueryKey(
  organizationId: OrganizationId,
  kind: FinancialEntryKind,
  monthKey: string,
  filter: EntryListFilter,
) {
  return [
    "organizations",
    organizationId,
    "finance",
    "entries",
    kind,
    monthKey,
    filter,
  ] as const;
}

export function useFinancialEntriesQuery(
  organizationId: OrganizationId,
  kind: FinancialEntryKind,
  monthKey: string,
  filter: EntryListFilter,
) {
  return useQuery({
    queryKey: getFinancialEntriesQueryKey(
      organizationId,
      kind,
      monthKey,
      filter,
    ),
    queryFn: async () =>
      fetchActionResult<ActionData<typeof listFinancialEntries>>(
        organizationApiPath(organizationId, "finance/entries", {
          kind,
          month: monthKey,
          filter,
        }),
      ),
  });
}
