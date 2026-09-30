import { useQuery } from "@tanstack/react-query";
import type { OrganizationId } from "@/features/organizations/types";
import { unwrapActionResult } from "@/lib/action-result";
import { listFinancialEntries } from "../actions";
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
      unwrapActionResult(
        await listFinancialEntries(organizationId, kind, monthKey, filter),
      ),
  });
}
