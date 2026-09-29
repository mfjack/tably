import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/features/organizations/queries";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const [firstOrganization] = await getUserOrganizations();

  if (!firstOrganization) redirect(ROUTES.newOrganization);

  redirect(`/${firstOrganization.slug}`);
}
