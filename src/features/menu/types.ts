import type { ProductId } from "@/features/products/types";

export const MENU_GROUPS = ["drinks", "food"] as const;

export type MenuGroup = (typeof MENU_GROUPS)[number];

export const MENU_GROUP_LABELS = {
  drinks: "para beber",
  food: "para comer",
} as const satisfies Record<MenuGroup, string>;

export type PublicMenuItem = {
  id: ProductId;
  name: string;
  detail: string | null;
  price: number;
};

export type PublicMenuSection = {
  group: MenuGroup;
  name: string;
  isHighlighted: boolean;
  items: PublicMenuItem[];
};

export type PublicMenu = {
  title: string;
  tagline: string | null;
  instagram: string | null;
  note: string | null;
  acceptsOrders: boolean;
  sections: PublicMenuSection[];
};
