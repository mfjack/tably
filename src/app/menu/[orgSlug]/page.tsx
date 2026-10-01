import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/features/menu/queries";
import { MenuCategoryNav } from "./components/menu-category-nav";
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
  const menu = await getPublicMenu(orgSlug);
  if (!menu) notFound();

  const instagramHandle = menu.instagram?.replace(/^@/, "");
  const menuItems = menu.sections.flatMap((section) => section.items);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-10 pb-32 sm:px-6">
        <header className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-3xl tracking-tight">{menu.title}</h1>
          {menu.tagline && (
            <p className="text-muted-foreground">{menu.tagline}</p>
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
          <p className="rounded-xl bg-muted px-4 py-3 text-muted-foreground text-sm">
            {menu.note}
          </p>
        )}

        {instagramHandle && (
          <footer className="flex justify-center pt-2">
            <Link
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              @{instagramHandle}
            </Link>
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
