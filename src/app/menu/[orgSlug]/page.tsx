import { AtSign, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicLoyaltyProgram,
  getPublicMenu,
} from "@/features/menu/queries";
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
  const [menu, loyaltyProgram] = await Promise.all([
    getPublicMenu(orgSlug),
    getPublicLoyaltyProgram(orgSlug),
  ]);
  if (!menu) notFound();

  const instagramHandle = menu.instagram?.replace(/^@/, "");
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
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <MenuOpeningStatus status={menu.openingStatus} />
            {instagramHandle && (
              <Link
                href={`https://instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-full border px-3 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                <AtSign className="size-4" aria-hidden />
                {instagramHandle}
              </Link>
            )}
          </div>
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
                acceptsOrders={menu.acceptsOrders}
                section={section}
              />
            ))}
          </div>
        )}

        {menu.note && (
          <p className="flex gap-3 rounded-2xl bg-muted px-4 py-3 text-muted-foreground text-sm">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {menu.note}
          </p>
        )}
      </div>
      <MenuOrderBar
        menuSlug={orgSlug}
        loyaltyProgram={loyaltyProgram}
        acceptsOrders={menu.acceptsOrders}
        items={menuItems}
      />
    </main>
  );
}
