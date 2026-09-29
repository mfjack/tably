import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const PIN_PATTERN = /^\d{4,6}$/;

export const operatorPinSchema = z
  .string()
  .regex(PIN_PATTERN, "O PIN deve ter de 4 a 6 números.");

export function createOperatorSchema(isEditing: boolean) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Informe o nome do operador.")
        .max(40, "Nome muito longo."),
      pin: isEditing
        ? z.union([z.literal(""), operatorPinSchema])
        : operatorPinSchema,
      allowedModules: z.array(z.enum(Constants.public.Enums.app_module)),
      canAccessSettings: z.boolean(),
    })
    .refine(
      (operator) =>
        operator.allowedModules.length > 0 || operator.canAccessSettings,
      {
        message: "Escolha pelo menos uma página.",
        path: ["allowedModules"],
      },
    );
}

export type OperatorInput = z.infer<ReturnType<typeof createOperatorSchema>>;
