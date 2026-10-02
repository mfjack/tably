import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/features/auth/queries";
import { getUserOrganizations } from "@/features/organizations/queries";
import { ROUTES } from "@/lib/routes";
import { LandingPage } from "./components/landing-page";

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) return <LandingPage />;

  const [firstOrganization] = await getUserOrganizations();

  if (!firstOrganization) redirect(ROUTES.newOrganization);

  redirect(`/${firstOrganization.slug}`);
}
