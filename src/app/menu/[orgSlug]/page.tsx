import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstagramLink } from "@/features/menu/components/instagram-link";
import { MenuNote } from "@/features/menu/components/menu-note";
import {
  getPublicLoyaltyProgram,
  getPublicMenu,
} from "@/features/menu/queries";
import { getUserOrganizationBySlug } from "@/features/organizations/queries";
import { MenuCategoryNav } from "./components/menu-category-nav";
import { MenuLoyaltyDialog } from "./components/menu-loyalty-dialog";
import { MenuOpeningStatus } from "./components/menu-opening-status";
import { MenuOrderBar } from "./components/menu-order-bar";
import { MenuSection } from "./components/menu-section";

export async function generateMetadata({
  params,
}: PageProps<"/menu/[orgSlug]">): Promise<Metadata> {
  const { orgSlug } = await params;
  const menu = await getPublicMenu(orgSlug);
  return { title: menu ? `Cardápio · ${menu.title}` : "Cardápio" };
}

export default async function PublicMenuPage({
  params,
}: PageProps<"/menu/[orgSlug]">) {
  const { orgSlug } = await params;
  const [menu, loyaltyProgram, viewerOrganization] = await Promise.all([
    getPublicMenu(orgSlug),
    getPublicLoyaltyProgram(orgSlug),
    getUserOrganizationBySlug(orgSlug),
  ]);
  if (!menu) notFound();

  const waiterOrganizationId =
    menu.isWaiterOrdering && viewerOrganization ? viewerOrganization.id : null;
  const acceptsOrders = menu.acceptsOrders || waiterOrganizationId !== null;

  const menuItems = menu.sections.flatMap((section) => section.items);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-10 pb-32 sm:px-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-bold text-4xl tracking-tight">{menu.title}</h1>
          {menu.tagline && (
            <p className="max-w-md text-balance text-muted-foreground">
              {menu.tagline}
            </p>
          )}
          {!waiterOrganizationId && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <MenuOpeningStatus status={menu.openingStatus} />
              {menu.instagram && <InstagramLink handle={menu.instagram} />}
            </div>
          )}
          {loyaltyProgram && (
            <div className="pt-3">
              <MenuLoyaltyDialog menuSlug={orgSlug} program={loyaltyProgram} />
            </div>
          )}
        </header>

        {menu.sections.length > 1 && (
          <MenuCategoryNav sections={menu.sections} />
        )}

        {menu.sections.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Cardápio em atualização.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {menu.sections.map((section) => (
              <MenuSection
                key={section.id}
                menuSlug={orgSlug}
                acceptsOrders={acceptsOrders}
                section={section}
              />
            ))}
          </div>
        )}

        {menu.note && <MenuNote note={menu.note} />}
      </div>
      <MenuOrderBar
        menuSlug={orgSlug}
        loyaltyProgram={loyaltyProgram}
        acceptsOrders={acceptsOrders}
        waiterOrganizationId={waiterOrganizationId}
        items={menuItems}
      />
    </main>
  );
}
