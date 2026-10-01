import type { MenuGroup } from "@/features/menu/types";
import type { Brand } from "@/lib/brand";

export type CategoryId = Brand<string, "CategoryId">;

export type Category = {
  id: CategoryId;
  name: string;
  productCount: number;
  menuGroup: MenuGroup | null;
  isMenuHighlighted: boolean;
};
