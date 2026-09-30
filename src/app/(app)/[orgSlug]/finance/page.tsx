import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { getMonthKey } from "@/features/time-clock/time-utils";
import { FinanceView } from "./components/finance-view";

const financeModule = getAppModule("finance");

export const metadata: Metadata = { title: financeModule.label };

export default async function FinancePage({
  params,
}: PageProps<"/[orgSlug]/finance">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "finance");
  if (!canManageOrganization(organization.role)) notFound();

  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  return (
    <FinanceView
      organizationId={organization.id}
      title={financeModule.label}
      description={financeModule.description}
      today={clock.today}
      initialMonthKey={getMonthKey(clock.today)}
    />
  );
}
