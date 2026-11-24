import type { CategoryId } from "@/features/categories/types";
import type {
  OpeningHour,
  OpeningStatus,
} from "@/features/organizations/opening-hours";
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
  imageUrl: string | null;
  isDailyLuck: boolean;
  price: number;
  isAvailable: boolean;
  remaining: number | null;
  addons: PublicMenuAddon[];
};

export type PublicMenuSection = {
  id: CategoryId;
  name: string;
  items: PublicMenuItem[];
};

export type PublicMenu = {
  title: string;
  tagline: string | null;
  instagram: string | null;
  note: string | null;
  acceptsOrders: boolean;
  isWaiterOrdering: boolean;
  openingStatus: OpeningStatus;
  openingHours: OpeningHour[];
  sections: PublicMenuSection[];
};

export type PublicLoyaltyProgram = {
  stampsRequired: number;
  rewardDescription: string;
};
