import type { Metadata } from "next";
import { getAppModule } from "@/features/modules/app-modules";
import { requireVisibleModule } from "@/features/modules/require-visible-module";
import { canManageOrganization } from "@/features/organizations/permissions";
import { LoyaltyView } from "./components/loyalty-view";

const loyaltyModule = getAppModule("loyalty");

export const metadata: Metadata = { title: loyaltyModule.label };

export default async function LoyaltyPage({
  params,
}: PageProps<"/[orgSlug]/loyalty">) {
  const { orgSlug } = await params;
  const organization = await requireVisibleModule(orgSlug, "loyalty");
  const { isEnabled: _isEnabled, ...program } = organization.loyalty;

  return (
    <LoyaltyView
      organizationId={organization.id}
      title={loyaltyModule.label}
      program={program}
      canManage={canManageOrganization(organization.role)}
    />
  );
}
