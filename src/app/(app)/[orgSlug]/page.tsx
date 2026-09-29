import { notFound, redirect } from "next/navigation";
import { buildOrganizationHomePath } from "@/features/modules/app-modules";
import { getEffectiveHiddenModules } from "@/features/operators/access";
import { getOperatorAccess } from "@/features/operators/queries";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";

export default async function OrganizationHomePage({
  params,
}: PageProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const organization = await getUserOrganizationBySlug(orgSlug);

  if (!organization) notFound();

  const access = await getOperatorAccess(organization.id);

  redirect(
    buildOrganizationHomePath(
      organization.slug,
      getEffectiveHiddenModules(organization.hiddenModules, access),
    ),
  );
}
