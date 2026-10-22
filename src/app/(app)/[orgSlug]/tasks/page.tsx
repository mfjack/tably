import type { Metadata } from "next";
import { getCurrentUserId } from "@/features/auth/queries";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { listTeamMemberSummaries } from "@/features/team/queries";
import { TasksView } from "./components/tasks-view";

const tasksModule = getAppModule("tasks");

export const metadata: Metadata = { title: tasksModule.label };

export default async function TasksPage({
  params,
}: PageProps<"/[orgSlug]/tasks">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "tasks");
  const [members, currentUserId] = await Promise.all([
    listTeamMemberSummaries(organization.id),
    getCurrentUserId(),
  ]);

  return (
    <TasksView
      organizationId={organization.id}
      businessName={organization.name}
      title={tasksModule.label}
      canManage={canManageCatalog(organization.role)}
      members={members}
      currentUserId={currentUserId}
    />
  );
}
