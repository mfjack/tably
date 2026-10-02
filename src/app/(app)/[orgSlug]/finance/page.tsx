import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFinancialOverview,
  listFinancialEntries,
} from "@/features/finance/actions";
import { listFinancialCategories } from "@/features/finance/category-actions";
import { getFinancialCategoriesQueryKey } from "@/features/finance/hooks/use-financial-categories-query";
import { getFinancialEntriesQueryKey } from "@/features/finance/hooks/use-financial-entries-query";
import { getFinancialOverviewQueryKey } from "@/features/finance/hooks/use-financial-overview-query";
import { getAppModule } from "@/features/modules/app-modules";
import { prefetchModuleQueries } from "@/features/modules/prefetch-module-queries";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { getMonthKey, parseMonthKey } from "@/features/time-clock/time-utils";
import type { ActionQuery } from "@/lib/query/prefetch-action-queries";
import { getSearchParamValue } from "@/lib/search-params";
import { FinanceView } from "./components/finance-view";
import {
  DEFAULT_ENTRY_STATUS_FILTER,
  DEFAULT_FINANCE_TAB,
  parseEntryStatusFilter,
  parseFinanceTab,
} from "./finance-search-params";

const financeModule = getAppModule("finance");

export const metadata: Metadata = { title: financeModule.label };

export default async function FinancePage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/finance">) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const organization = await requireVisibleModule(orgSlug, "finance");
  if (!canManageOrganization(organization.role)) notFound();

  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  const initialMonthKey = getMonthKey(clock.today);
  const monthKey =
    parseMonthKey(getSearchParamValue(query.month) ?? "") ?? initialMonthKey;
  const tab =
    parseFinanceTab(getSearchParamValue(query.tab) ?? "") ??
    DEFAULT_FINANCE_TAB;
  const statusFilter =
    parseEntryStatusFilter(getSearchParamValue(query.status) ?? "") ??
    DEFAULT_ENTRY_STATUS_FILTER;
  const organizationId = organization.id;
  const queries: ActionQuery[] = [
    {
      queryKey: getFinancialCategoriesQueryKey(organizationId),
      action: () => listFinancialCategories(organizationId),
    },
  ];
  if (tab === "overview") {
    queries.push({
      queryKey: getFinancialOverviewQueryKey(organizationId, monthKey),
      action: () => getFinancialOverview(organizationId, monthKey),
    });
  }
  if (tab === "payables") {
    queries.push({
      queryKey: getFinancialEntriesQueryKey(
        organizationId,
        "expense",
        monthKey,
        statusFilter,
      ),
      action: () =>
        listFinancialEntries(organizationId, "expense", monthKey, statusFilter),
    });
  }

  const dehydratedState = await prefetchModuleQueries(
    organizationId,
    "finance",
    queries,
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <FinanceView
        organizationId={organization.id}
        title={financeModule.label}
        description={financeModule.description}
        today={clock.today}
        initialMonthKey={initialMonthKey}
      />
    </HydrationBoundary>
  );
}
