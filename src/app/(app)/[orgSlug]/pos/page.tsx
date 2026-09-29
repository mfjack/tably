import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { PosView } from "./components/pos-view";

const posModule = getAppModule("pos");

export const metadata: Metadata = { title: posModule.label };

export default async function PosPage({ params }: PageProps<"/[orgSlug]/pos">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "pos");

  return (
    <PosView
      organizationId={organization.id}
      organizationName={organization.name}
    />
  );
}
