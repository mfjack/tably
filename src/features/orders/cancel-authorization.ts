import * as z from "zod";

export const cancelPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "Digite os 4 números do PIN."),
});

export type CancelPinInput = z.infer<typeof cancelPinSchema>;

const CANCEL_AUTHORIZATION_MESSAGES: Readonly<Record<string, string>> = {
  pin_required: "Digite o PIN para autorizar.",
  invalid_pin: "PIN incorreto.",
  locked: "Muitas tentativas erradas. Espere 5 minutos e tente de novo.",
};

export function getCancelAuthorizationError(status: string): string | null {
  if (status === "authorized") return null;
  return CANCEL_AUTHORIZATION_MESSAGES[status] ?? "Não foi possível autorizar.";
}
