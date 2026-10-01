import { z } from "zod";

export const menuSettingsSchema = z.object({
  isPublished: z.boolean(),
  isOnlineOrderingEnabled: z.boolean(),
  title: z.string().trim().max(40, "Título muito longo."),
  tagline: z.string().trim().max(60, "Frase muito longa."),
  instagram: z.string().trim().max(40, "Usuário muito longo."),
  note: z.string().trim().max(120, "Observação muito longa."),
});

export type MenuSettingsInput = z.infer<typeof menuSettingsSchema>;
