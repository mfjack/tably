import * as z from "zod";

export const MENU_ORDERING_MODES = ["everyone", "team"] as const;

export type MenuOrderingMode = (typeof MENU_ORDERING_MODES)[number];

export const menuSettingsSchema = z.object({
  isOnlineOrderingEnabled: z.boolean(),
  orderingMode: z.enum(MENU_ORDERING_MODES),
  title: z.string().trim().max(40, "Título muito longo."),
  tagline: z.string().trim().max(60, "Frase muito longa."),
  instagram: z.string().trim().max(40, "Usuário muito longo."),
  note: z.string().trim().max(120, "Observação muito longa."),
});

export type MenuSettingsInput = z.infer<typeof menuSettingsSchema>;
