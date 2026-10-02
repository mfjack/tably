import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import {
  buildOrganizationHomePath,
  SETTINGS_PAGE,
} from "@/features/modules/app-modules";
import {
  canAccessSettings,
  getEffectiveHiddenModules,
} from "@/features/operators/access";
import { getOperatorAccess } from "@/features/operators/queries";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import { SettingsView } from "./components/settings-view";

export const metadata: Metadata = { title: SETTINGS_PAGE.label };

export default async function SettingsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { tab } = await searchParams;
  const [organization, currentUser] = await Promise.all([
    getUserOrganizationBySlug(orgSlug),
    getCurrentUser(),
  ]);

  if (!organization || !currentUser) notFound();

  const access = await getOperatorAccess(organization.id);

  if (!canAccessSettings(access)) {
    const homePath = buildOrganizationHomePath(
      organization.slug,
      getEffectiveHiddenModules(organization.hiddenModules, access),
    );
    if (homePath.endsWith(`/${SETTINGS_PAGE.path}`)) notFound();
    redirect(homePath);
  }

  return (
    <SettingsView
      initialTab={typeof tab === "string" ? tab : undefined}
      title={SETTINGS_PAGE.label}
      description={SETTINGS_PAGE.description}
      organization={organization}
      currentUser={currentUser}
      canManageOrganization={canManageOrganization(organization.role)}
    />
  );
}
