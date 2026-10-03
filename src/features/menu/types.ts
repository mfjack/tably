import type { CategoryId } from "@/features/categories/types";
import type { ProductId } from "@/features/products/types";

export type PublicMenuItem = {
  id: ProductId;
  name: string;
  detail: string | null;
  price: number;
  isAvailable: boolean;
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
  sections: PublicMenuSection[];
};

export type PublicLoyaltyProgram = {
  stampsRequired: number;
  rewardDescription: string;
};
