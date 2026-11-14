import * as z from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { toTitleCase } from "@/lib/title-case";

const PAGE_REQUIRED_MESSAGE = "Escolha pelo menos uma página.";

const personNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da pessoa.")
  .max(60, "Nome muito longo.")
  .transform(toTitleCase);

const pageAccessShape = {
  allowedModules: z.array(z.enum(Constants.public.Enums.app_module)),
  canAccessSettings: z.boolean(),
};

function hasAnyPage(access: {
  allowedModules: readonly string[];
  canAccessSettings: boolean;
  hasOwnerAccess?: boolean;
}) {
  return (
    access.hasOwnerAccess === true ||
    access.allowedModules.length > 0 ||
    access.canAccessSettings
  );
}

export const memberAccessSchema = z
  .object({
    fullName: personNameSchema,
    hasOwnerAccess: z.boolean(),
    ...pageAccessShape,
  })
  .refine(hasAnyPage, {
    message: PAGE_REQUIRED_MESSAGE,
    path: ["allowedModules"],
  });

export const invitationSchema = z
  .object({
    inviteeName: personNameSchema,
    ...pageAccessShape,
  })
  .refine(hasAnyPage, {
    message: PAGE_REQUIRED_MESSAGE,
    path: ["allowedModules"],
  });

export const teamAccessFormSchema = z
  .object({
    inviteeName: personNameSchema,
    hasOwnerAccess: z.boolean(),
    ...pageAccessShape,
  })
  .refine(hasAnyPage, {
    message: PAGE_REQUIRED_MESSAGE,
    path: ["allowedModules"],
  });

export type MemberAccessInput = z.infer<typeof memberAccessSchema>;
export type TeamAccessFormInput = z.infer<typeof teamAccessFormSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
