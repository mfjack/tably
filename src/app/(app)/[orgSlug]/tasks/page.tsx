import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import {
  getOperatorAccess,
  listOperatorSummaries,
} from "@/features/operators/queries";
import { canManageCatalog } from "@/features/organizations/permissions";
import { TasksView } from "./components/tasks-view";

const tasksModule = getAppModule("tasks");

export const metadata: Metadata = { title: tasksModule.label };

export default async function TasksPage({
  params,
}: PageProps<"/[orgSlug]/tasks">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "tasks");
  const [operators, access] = await Promise.all([
    listOperatorSummaries(organization.id),
    getOperatorAccess(organization.id),
  ]);

  return (
    <TasksView
      organizationId={organization.id}
      businessName={organization.name}
      title={tasksModule.label}
      canManage={canManageCatalog(organization.role)}
      operators={operators}
      activeOperatorId={access.mode === "unlocked" ? access.operator.id : null}
    />
  );
}
