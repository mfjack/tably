import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { TasksView } from "./components/tasks-view";

const tasksModule = getAppModule("tasks");

export const metadata: Metadata = { title: tasksModule.label };

export default async function TasksPage({
  params,
}: PageProps<"/[orgSlug]/tasks">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "tasks");

  return (
    <TasksView
      organizationId={organization.id}
      title={tasksModule.label}
      canManage={canManageCatalog(organization.role)}
    />
  );
}
