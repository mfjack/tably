import type { Brand } from "@/lib/brand";

export type CategoryId = Brand<string, "CategoryId">;

export type Category = {
  id: CategoryId;
  name: string;
  productCount: number;
};
