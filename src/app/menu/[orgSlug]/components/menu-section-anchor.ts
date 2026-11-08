import type { PublicMenuSectionId } from "@/features/menu/types";

export function buildMenuSectionAnchor(sectionId: PublicMenuSectionId) {
  return `category-${sectionId}`;
}
