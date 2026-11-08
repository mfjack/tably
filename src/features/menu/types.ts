import type { CategoryId } from "@/features/categories/types";
import type { OpeningStatus } from "@/features/organizations/opening-hours";
import type { ProductAddonId } from "@/features/product-addons/types";
import type { ProductId } from "@/features/products/types";

export type PublicMenuAddon = {
  id: ProductAddonId;
  name: string;
  price: number;
  isAvailable: boolean;
};

export type PublicMenuItem = {
  id: ProductId;
  name: string;
  detail: string | null;
  description: string | null;
  isDailyLuck: boolean;
  price: number;
  isAvailable: boolean;
  remaining: number | null;
  addons: PublicMenuAddon[];
};

export const DAILY_LUCK_SECTION_ID = "daily-luck";

export type PublicMenuSectionId = CategoryId | typeof DAILY_LUCK_SECTION_ID;

export type PublicMenuSection = {
  id: PublicMenuSectionId;
  name: string;
  description?: string;
  items: PublicMenuItem[];
};

export type PublicMenu = {
  title: string;
  tagline: string | null;
  instagram: string | null;
  note: string | null;
  acceptsOrders: boolean;
  openingStatus: OpeningStatus;
  sections: PublicMenuSection[];
};

export type PublicLoyaltyProgram = {
  stampsRequired: number;
  rewardDescription: string;
};
