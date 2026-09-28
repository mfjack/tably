import { redirect } from "next/navigation";
import {
  buildOrganizationPath,
  DEFAULT_MODULE_PATH,
} from "@/features/modules/app-modules";
import { getUserOrganizations } from "@/features/organizations/queries";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const [firstOrganization] = await getUserOrganizations();

  if (!firstOrganization) redirect(ROUTES.newOrganization);

  redirect(buildOrganizationPath(firstOrganization.slug, DEFAULT_MODULE_PATH));
}
