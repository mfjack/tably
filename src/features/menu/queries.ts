import "server-only";

import { cache } from "react";
import { z } from "zod";
import type { ProductId } from "@/features/products/types";
import { createClient } from "@/lib/supabase/server";
import { MENU_GROUPS, type PublicMenu } from "./types";

const publicMenuSchema = z.object({
  title: z.string(),
  tagline: z.string().nullable(),
  instagram: z.string().nullable(),
  note: z.string().nullable(),
  acceptsOrders: z.boolean(),
  sections: z.array(
    z.object({
      group: z.enum(MENU_GROUPS),
      name: z.string(),
      isHighlighted: z.boolean(),
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
