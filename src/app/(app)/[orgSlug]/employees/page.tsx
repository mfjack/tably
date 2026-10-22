import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOrganizationPath,
  getAppModule,
} from "@/features/modules/app-modules";
import {
  getAccessibleModuleIds,
  requireVisibleModule,
} from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { EmployeesView } from "./components/employees-view";

const employeesModule = getAppModule("employees");

export const metadata: Metadata = { title: employeesModule.label };

export default async function EmployeesPage({
  params,
}: PageProps<"/[orgSlug]/employees">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "employees");
  if (!canManageOrganization(organization.role)) notFound();

  const [clock, accessibleModuleIds] = await Promise.all([
    getOrganizationClock(organization.id),
    getAccessibleModuleIds(organization),
  ]);
  if (!clock) notFound();

  return (
    <EmployeesView
      organizationId={organization.id}
      organizationSlug={organization.slug}
      title={employeesModule.label}
      description={employeesModule.description}
      today={clock.today}
      employeesHref={buildOrganizationPath(organization.slug, "employees")}
      payrollHref={
        accessibleModuleIds.includes("payroll")
          ? buildOrganizationPath(organization.slug, "payroll")
          : null
      }
    />
  );
}
