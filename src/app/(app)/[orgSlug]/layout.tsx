import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/features/auth/queries";
import {
  getUserOrganizationBySlug,
  getUserOrganizations,
} from "@/features/organizations/queries";
import { AppSidebar } from "./components/app-sidebar";

const SIDEBAR_STATE_COOKIE = "sidebar_state";

export default async function OrganizationLayout({
  children,
  params,
}: LayoutProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const [organization, organizations, currentUser, cookieStore] =
    await Promise.all([
      getUserOrganizationBySlug(orgSlug),
      getUserOrganizations(),
      getCurrentUser(),
      cookies(),
    ]);

  if (!organization || !currentUser) notFound();

  const isSidebarOpen =
    cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <AppSidebar
        organization={organization}
        organizations={organizations}
        currentUser={currentUser}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
