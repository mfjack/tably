import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { SETTINGS_PAGE } from "@/features/modules/app-modules";
import { canManageOrganization } from "@/features/organizations/permissions";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import { canAccessSettings } from "@/features/team/access";
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

  return (
    <SettingsView
      initialTab={typeof tab === "string" ? tab : undefined}
      title={SETTINGS_PAGE.label}
      organization={organization}
      currentUser={currentUser}
      canManageEstablishment={
        canAccessSettings(organization) &&
        canManageOrganization(organization.role)
      }
      isOwner={organization.role === "owner"}
    />
  );
}
