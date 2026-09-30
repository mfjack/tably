import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { getOrganizationClock } from "@/features/time-clock/load-timesheet";
import { TimeClockView } from "./components/time-clock-view";

const timeClockModule = getAppModule("time_clock");

export const metadata: Metadata = { title: timeClockModule.label };

export default async function TimeClockPage({
  params,
}: PageProps<"/[orgSlug]/time-clock">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "time_clock");
  const clock = await getOrganizationClock(organization.id);
  if (!clock) notFound();

  return (
    <TimeClockView
      organizationId={organization.id}
      title={timeClockModule.label}
      business={{
        name: organization.name,
        taxId: organization.taxId,
        phone: organization.phone,
        address: organization.address,
      }}
      timeZone={clock.timeZone}
    />
  );
}
