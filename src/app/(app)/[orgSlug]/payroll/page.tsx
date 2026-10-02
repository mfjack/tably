import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import { prefetchModuleQueries } from "@/features/modules/prefetch-module-queries";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getPayrollMonth } from "@/features/payroll/actions";
import { getPayrollMonthQueryKey } from "@/features/payroll/hooks/use-payroll-month-query";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { getMonthKey, parseMonthKey } from "@/features/time-clock/time-utils";
import type { ActionQuery } from "@/lib/query/prefetch-action-queries";
import { getSearchParamValue } from "@/lib/search-params";
import { PayrollView } from "./components/payroll-view";
import { DEFAULT_PAYROLL_TAB, parsePayrollTab } from "./payroll-search-params";

const payrollModule = getAppModule("payroll");

export const metadata: Metadata = { title: payrollModule.label };

export default async function PayrollPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/payroll">) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const organization = await requireVisibleModule(orgSlug, "payroll");
  if (!canManageOrganization(organization.role)) notFound();

  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  const initialMonthKey = getMonthKey(clock.today);
  const monthKey =
    parseMonthKey(getSearchParamValue(query.month) ?? "") ?? initialMonthKey;
  const tab =
    parsePayrollTab(getSearchParamValue(query.tab) ?? "") ??
    DEFAULT_PAYROLL_TAB;
  const organizationId = organization.id;
  const queries: ActionQuery[] =
    tab === "monthly"
      ? [
          {
            queryKey: getPayrollMonthQueryKey(organizationId, monthKey),
            action: () => getPayrollMonth(organizationId, monthKey),
          },
        ]
      : [];

  const dehydratedState = await prefetchModuleQueries(
    organizationId,
    "payroll",
    queries,
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <PayrollView
        organizationId={organization.id}
        title={payrollModule.label}
        description={payrollModule.description}
        business={{
          name: organization.name,
          taxId: organization.taxId,
          phone: organization.phone,
          address: organization.address,
        }}
        initialMonthKey={initialMonthKey}
        employeesHref={buildOrganizationPath(organization.slug, "employees")}
      />
    </HydrationBoundary>
  );
}
