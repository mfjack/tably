import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { EmployeeId } from "@/features/employees/types";
import { buildOrganizationPath } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { getMonthKey } from "@/features/time-clock/time-utils";
import { TimesheetView } from "./components/timesheet-view";

export const metadata: Metadata = { title: "Espelho de ponto" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmployeeTimesheetPage({
  params,
}: PageProps<"/[orgSlug]/employees/[employeeId]">) {
  const { orgSlug, employeeId } = await params;
  const organization = await requireVisibleModule(orgSlug, "employees");
  if (
    !canManageOrganization(organization.role) ||
    !UUID_PATTERN.test(employeeId)
  ) {
    notFound();
  }

  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  return (
    <TimesheetView
      organizationId={organization.id}
      employeeId={employeeId as EmployeeId}
      employeesHref={buildOrganizationPath(organization.slug, "employees")}
      business={{
        name: organization.name,
        taxId: organization.taxId,
        phone: organization.phone,
        address: organization.address,
      }}
      initialMonthKey={getMonthKey(clock.today)}
    />
  );
}
