import "server-only";

import { cache } from "react";
import * as z from "zod";
import type { CategoryId } from "@/features/categories/types";
import { openingStatusSchema } from "@/features/organizations/opening-hours";
import type { ProductAddonId } from "@/features/product-addons/types";
import type { ProductId } from "@/features/products/types";
import { createClient } from "@/lib/supabase/server";
import {
  DAILY_LUCK_SECTION_ID,
  type PublicLoyaltyProgram,
  type PublicMenu,
  type PublicMenuSection,
} from "./types";

const DAILY_LUCK_SECTION_NAME = "Sorte do Dia";
const DAILY_LUCK_SECTION_DESCRIPTION =
  "Só no fim de semana: delícias que não estão no cardápio de sempre.";

function withDailyLuckSection(menu: PublicMenu): PublicMenu {
  const dailyLuckItems = menu.sections.flatMap((section) =>
    section.items.filter((item) => item.isDailyLuck),
  );
  if (dailyLuckItems.length === 0) return menu;

  const dailyLuckSection: PublicMenuSection = {
    id: DAILY_LUCK_SECTION_ID,
    name: DAILY_LUCK_SECTION_NAME,
    description: DAILY_LUCK_SECTION_DESCRIPTION,
    items: dailyLuckItems,
  };
  const regularSections = menu.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.isDailyLuck),
    }))
    .filter((section) => section.items.length > 0);

  return { ...menu, sections: [dailyLuckSection, ...regularSections] };
}

const publicMenuSchema = z.object({
  title: z.string(),
  tagline: z.string().nullable(),
  instagram: z.string().nullable(),
  note: z.string().nullable(),
  acceptsOrders: z.boolean(),
  openingStatus: openingStatusSchema.catch({
    isConfigured: false,
    isOpen: true,
  }),
  sections: z.array(
    z.object({
      id: z.string().transform((id) => id as CategoryId),
      name: z.string(),
      items: z.array(
        z.object({
          id: z.string().transform((id) => id as ProductId),
          name: z.string(),
          detail: z.string().nullable(),
          description: z.string().nullable().default(null),
          isDailyLuck: z.boolean().default(false),
          price: z.number(),
          isAvailable: z.boolean(),
          remaining: z.number().nullable(),
          addons: z
            .array(
              z.object({
                id: z.string().transform((id) => id as ProductAddonId),
                name: z.string(),
                price: z.number(),
                isAvailable: z.boolean().default(true),
              }),
            )
            .default([]),
        }),
      ),
    }),
  ),
});

export const getPublicMenu = cache(
  async (organizationSlug: string): Promise<PublicMenu | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_menu", {
      p_slug: organizationSlug,
    });
    if (error || data === null) return null;

    const parsedMenu = publicMenuSchema.safeParse(data);
    return parsedMenu.success ? withDailyLuckSection(parsedMenu.data) : null;
  },
);

const publicLoyaltyProgramSchema = z.object({
  stamps_required: z.number(),
  reward_description: z.string(),
});

export const getPublicLoyaltyProgram = cache(
  async (organizationSlug: string): Promise<PublicLoyaltyProgram | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_loyalty_program", {
      p_slug: organizationSlug,
    });
    if (error || data === null) return null;

    const parsedProgram = publicLoyaltyProgramSchema.safeParse(data);
    return parsedProgram.success
      ? {
          stampsRequired: parsedProgram.data.stamps_required,
          rewardDescription: parsedProgram.data.reward_description,
        }
      : null;
  },
);
