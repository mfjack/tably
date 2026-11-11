"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryId } from "@/features/categories/types";
import type { PublicMenuSection } from "@/features/menu/types";
import { cn } from "@/lib/utils";
import { buildMenuSectionAnchor } from "./menu-section-anchor";

const ACTIVE_SECTION_ROOT_MARGIN = "-30% 0px -60% 0px";
const SCROLL_EDGE_TOLERANCE = 1;

const EDGE_FADE_CLASS_NAMES = {
  none: "",
  start:
    "[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black)]",
  end: "[mask-image:linear-gradient(to_left,transparent,black_2.5rem,black)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)]",
} as const;

type EdgeFade = keyof typeof EDGE_FADE_CLASS_NAMES;

function getEdgeFade(list: HTMLElement): EdgeFade {
  const hasHiddenStart = list.scrollLeft > SCROLL_EDGE_TOLERANCE;
  const hasHiddenEnd =
    list.scrollLeft + list.clientWidth <
    list.scrollWidth - SCROLL_EDGE_TOLERANCE;
  if (hasHiddenStart && hasHiddenEnd) return "both";
  if (hasHiddenStart) return "start";
  if (hasHiddenEnd) return "end";
  return "none";
}

type MenuCategoryNavProps = {
  sections: readonly PublicMenuSection[];
};

export function MenuCategoryNav({ sections }: MenuCategoryNavProps) {
  const [activeSectionId, setActiveSectionId] = useState<CategoryId | null>(
    sections[0]?.id ?? null,
  );
  const listRef = useRef<HTMLUListElement>(null);
  const [edgeFade, setEdgeFade] = useState<EdgeFade>("none");

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const updateEdgeFade = () => setEdgeFade(getEdgeFade(list));
    updateEdgeFade();
    const resizeObserver = new ResizeObserver(updateEdgeFade);
    resizeObserver.observe(list);
    list.addEventListener("scroll", updateEdgeFade, { passive: true });
    return () => {
      resizeObserver.disconnect();
      list.removeEventListener("scroll", updateEdgeFade);
    };
  }, []);

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
      <ul
        ref={listRef}
        className={cn(
          "-mx-4 flex scroll-px-4 gap-2 overflow-x-auto px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6",
          EDGE_FADE_CLASS_NAMES[edgeFade],
        )}
      >
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
