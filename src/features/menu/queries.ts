import "server-only";

import { cache } from "react";
import * as z from "zod";
import type { CategoryId } from "@/features/categories/types";
import type { ProductId } from "@/features/products/types";
import { createClient } from "@/lib/supabase/server";
import type { PublicLoyaltyProgram, PublicMenu } from "./types";

const publicMenuSchema = z.object({
  title: z.string(),
  tagline: z.string().nullable(),
  instagram: z.string().nullable(),
  note: z.string().nullable(),
  acceptsOrders: z.boolean(),
  sections: z.array(
    z.object({
      id: z.string().transform((id) => id as CategoryId),
      name: z.string(),
      items: z.array(
        z.object({
          id: z.string().transform((id) => id as ProductId),
          name: z.string(),
          detail: z.string().nullable(),
          price: z.number(),
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
    return parsedMenu.success ? parsedMenu.data : null;
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
