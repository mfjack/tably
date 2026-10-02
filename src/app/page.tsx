import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/features/auth/queries";
import { getUserOrganizations } from "@/features/organizations/queries";
import { ROUTES } from "@/lib/routes";
import { LandingPage } from "./components/landing-page";

export const metadata: Metadata = {
  title: {
    absolute:
      "Tably · Sistema para cafeterias, restaurantes, lanchonetes e bares",
  },
  description:
    "PDV, comandas, cozinha, caixa, cardápio digital com QR Code, estoque e financeiro em um só lugar. Teste 14 dias grátis.",
};

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) return <LandingPage />;

  const [firstOrganization] = await getUserOrganizations();

  if (!firstOrganization) redirect(ROUTES.newOrganization);

  redirect(`/${firstOrganization.slug}`);
}
