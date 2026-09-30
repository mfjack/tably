import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { getMonthKey } from "@/features/time-clock/time-utils";
import { PayrollView } from "./components/payroll-view";

const payrollModule = getAppModule("payroll");

export const metadata: Metadata = { title: payrollModule.label };

export default async function PayrollPage({
  params,
}: PageProps<"/[orgSlug]/payroll">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "payroll");
  if (!canManageOrganization(organization.role)) notFound();

  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  return (
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
      initialMonthKey={getMonthKey(clock.today)}
      employeesHref={buildOrganizationPath(organization.slug, "employees")}
    />
  );
}
