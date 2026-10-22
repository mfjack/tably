import * as z from "zod";
import { Constants } from "@/lib/supabase/database.types";

const PAGE_REQUIRED_MESSAGE = "Escolha pelo menos uma página.";

const pageAccessShape = {
  allowedModules: z.array(z.enum(Constants.public.Enums.app_module)),
  canAccessSettings: z.boolean(),
};

function hasAnyPage(access: {
  allowedModules: readonly string[];
  canAccessSettings: boolean;
}) {
  return access.allowedModules.length > 0 || access.canAccessSettings;
}

export const memberAccessSchema = z.object(pageAccessShape).refine(hasAnyPage, {
  message: PAGE_REQUIRED_MESSAGE,
  path: ["allowedModules"],
});

export const invitationSchema = z
  .object({
    inviteeName: z
      .string()
      .trim()
      .min(1, "Informe o nome da pessoa.")
      .max(60, "Nome muito longo."),
    ...pageAccessShape,
  })
  .refine(hasAnyPage, {
    message: PAGE_REQUIRED_MESSAGE,
    path: ["allowedModules"],
  });

export type MemberAccessInput = z.infer<typeof memberAccessSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
