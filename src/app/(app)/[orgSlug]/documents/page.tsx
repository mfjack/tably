import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageCatalog } from "@/features/organizations/permissions";
import { DocumentsView } from "./components/documents-view";

const documentsModule = getAppModule("documents");

export const metadata: Metadata = { title: documentsModule.label };

export default async function DocumentsPage({
  params,
}: PageProps<"/[orgSlug]/documents">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "documents");

  return (
    <DocumentsView
      organizationId={organization.id}
      title={documentsModule.label}
      description={documentsModule.description}
      canManage={canManageCatalog(organization.role)}
    />
  );
}
