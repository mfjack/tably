import * as z from "zod";
import { formatCurrency } from "@/lib/format";
import type { OrderItemAddon, ProductAddonId } from "./types";

const orderItemAddonsSchema = z.array(
  z.object({
    addon_id: z.string(),
    name: z.string(),
    price: z.number(),
  }),
);

export function parseOrderItemAddons(value: unknown): OrderItemAddon[] {
  const parsed = orderItemAddonsSchema.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.map((addon) => ({
    addonId: addon.addon_id as ProductAddonId,
    name: addon.name,
    price: addon.price,
  }));
}

export function getAddonsTotal(
  addons: readonly Pick<OrderItemAddon, "price">[],
): number {
  return addons.reduce((total, addon) => total + addon.price, 0);
}

export function formatAddonLabel(
  addon: Pick<OrderItemAddon, "name" | "price">,
): string {
  return addon.price > 0
    ? `${addon.name} · + ${formatCurrency(addon.price)}`
    : addon.name;
}

export function formatAddonNames(
  addons: readonly Pick<OrderItemAddon, "name">[],
): string {
  return addons.map((addon) => `+ ${addon.name}`).join(" ");
}

export function formatItemNameWithAddons(
  productName: string,
  addons: readonly Pick<OrderItemAddon, "name">[],
): string {
  return addons.length > 0
    ? `${productName} ${formatAddonNames(addons)}`
    : productName;
}
