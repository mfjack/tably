import { notFound, redirect } from "next/navigation";
import { buildOrganizationHomePath } from "@/features/modules/app-modules";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import { getEffectiveHiddenModules } from "@/features/team/access";

export default async function OrganizationHomePage({
  params,
}: PageProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const organization = await getUserOrganizationBySlug(orgSlug);

  if (!organization) notFound();

  redirect(
    buildOrganizationHomePath(
      organization.slug,
      getEffectiveHiddenModules(organization),
    ),
  );
}
