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
    ? `${addon.name} + ${formatCurrency(addon.price)}`
    : addon.name;
}

export function getAddonNames(
  addons: readonly Pick<OrderItemAddon, "name">[],
): string[] {
  const countsByName = new Map<string, number>();
  for (const addon of addons) {
    countsByName.set(addon.name, (countsByName.get(addon.name) ?? 0) + 1);
  }
  return [...countsByName].map(([name, count]) =>
    count > 1 ? `${count}x ${name}` : name,
  );
}

export function resolveSelectedAddons<TAddon extends { id: string }>(
  addonIds: readonly string[] | undefined,
  availableAddons: readonly TAddon[],
): TAddon[] {
  return (addonIds ?? []).flatMap((addonId) =>
    availableAddons.filter((addon) => addon.id === addonId),
  );
}

export function formatAddonNames(
  addons: readonly Pick<OrderItemAddon, "name">[],
): string {
  return getAddonNames(addons)
    .map((addonName) => `+ ${addonName}`)
    .join(" ");
}

export function formatItemNameWithAddons(
  productName: string,
  addons: readonly Pick<OrderItemAddon, "name">[],
): string {
  return addons.length > 0
    ? `${productName} ${formatAddonNames(addons)}`
    : productName;
}
