import Link from "next/link";
import type { PublicMenuSection } from "@/features/menu/types";
import { buildMenuSectionAnchor } from "./menu-section";

type MenuCategoryNavProps = {
  sections: readonly PublicMenuSection[];
};

export function MenuCategoryNav({ sections }: MenuCategoryNavProps) {
  return (
    <nav
      aria-label="Categorias do cardápio"
      className="sticky top-0 z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex gap-2 overflow-x-auto">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <Link
              href={`#${buildMenuSectionAnchor(section.id)}`}
              className="flex h-10 items-center rounded-full border bg-card px-4 font-medium text-sm shadow-xs transition-colors hover:bg-muted"
            >
              {section.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
