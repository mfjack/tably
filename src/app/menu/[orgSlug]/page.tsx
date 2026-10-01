import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/features/menu/queries";
import { MENU_GROUPS } from "@/features/menu/types";
import { cn } from "@/lib/utils";
import { MenuGroupSection } from "./components/menu-group-section";
import { MenuOrderBar } from "./components/menu-order-bar";
import {
  menuHeadingFont,
  menuItemFont,
  menuTaglineFont,
  menuTitleFont,
} from "./menu-fonts";

const INSTAGRAM_REPEAT_COUNT = 3;

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
  const menu = await getPublicMenu(orgSlug);
  if (!menu) notFound();

  const groups = MENU_GROUPS.map((group) => ({
    group,
    sections: menu.sections.filter((section) => section.group === group),
  })).filter(({ sections }) => sections.length > 0);
  const instagramHandle = menu.instagram?.replace(/^@/, "");
  const menuItems = menu.sections.flatMap((section) => section.items);

  return (
    <main className="min-h-svh bg-white text-black">
      <div className="mx-auto flex max-w-2xl flex-col gap-12 px-6 pt-12 pb-32 sm:px-12">
        <header className="flex flex-col items-center">
          <h1
            className={cn(
              menuTitleFont.className,
              "text-center text-6xl lowercase leading-none tracking-tight sm:text-7xl",
            )}
          >
            {menu.title}
          </h1>
          {menu.tagline && (
            <p
              className={cn(
                menuTaglineFont.className,
                "-mt-1 self-center pl-24 text-xl sm:pl-40 sm:text-2xl",
              )}
            >
              {menu.tagline}
            </p>
          )}
        </header>

        {groups.map(({ group, sections }, groupIndex) => (
          <MenuGroupSection
            key={group}
            menuSlug={orgSlug}
            acceptsOrders={menu.acceptsOrders}
            group={group}
            sections={sections}
            hasIllustrations={groupIndex === 0}
            headingClassName={menuHeadingFont.className}
            itemClassName={menuItemFont.className}
          />
        ))}

        {groups.length === 0 && (
          <p className={cn(menuItemFont.className, "text-center")}>
            cardápio em atualização.
          </p>
        )}

        {menu.note && (
          <p
            className={cn(
              menuItemFont.className,
              "font-bold text-sm uppercase tracking-wide",
            )}
          >
            {menu.note}
          </p>
        )}

        {instagramHandle && (
          <footer
            className={cn(
              menuItemFont.className,
              "flex flex-wrap justify-center gap-x-6 gap-y-1 border-black border-t-2 pt-6 font-bold text-lg",
            )}
          >
            {Array.from({ length: INSTAGRAM_REPEAT_COUNT }, (_, index) => (
              <a
                key={`instagram-${index.toString()}`}
                href={`https://instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(index > 0 && "hidden sm:inline")}
              >
                @{instagramHandle}
              </a>
            ))}
          </footer>
        )}
      </div>
      <MenuOrderBar
        menuSlug={orgSlug}
        acceptsOrders={menu.acceptsOrders}
        items={menuItems}
      />
    </main>
  );
}
