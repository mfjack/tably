"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryId } from "@/features/categories/types";
import type { PublicMenuSection } from "@/features/menu/types";
import { cn } from "@/lib/utils";
import { buildMenuSectionAnchor } from "./menu-section-anchor";

const ACTIVE_SECTION_ROOT_MARGIN = "-30% 0px -60% 0px";

type MenuCategoryNavProps = {
  sections: readonly PublicMenuSection[];
};

export function MenuCategoryNav({ sections }: MenuCategoryNavProps) {
  const [activeSectionId, setActiveSectionId] = useState<CategoryId | null>(
    sections[0]?.id ?? null,
  );
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sectionsByAnchor = new Map(
      sections.map((section) => [
        buildMenuSectionAnchor(section.id),
        section.id,
      ]),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        const sectionId =
          visibleEntry && sectionsByAnchor.get(visibleEntry.target.id);
        if (sectionId) setActiveSectionId(sectionId);
      },
      { rootMargin: ACTIVE_SECTION_ROOT_MARGIN },
    );
    for (const anchor of sectionsByAnchor.keys()) {
      const element = document.getElementById(anchor);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!activeSectionId) return;
    listRef.current
      ?.querySelector(`[data-section-id="${activeSectionId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSectionId]);

  return (
    <nav
      aria-label="Categorias do cardápio"
      className="sticky top-0 z-30 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul ref={listRef} className="flex gap-2 overflow-x-auto">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          return (
            <li
              key={section.id}
              data-section-id={section.id}
              className="shrink-0"
            >
              <Link
                href={`#${buildMenuSectionAnchor(section.id)}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => setActiveSectionId(section.id)}
                className={cn(
                  "flex h-9 items-center rounded-full px-4 font-medium text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {section.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
