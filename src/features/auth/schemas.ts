import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um email válido."));

const newPasswordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres.")
  .regex(/[a-zA-Z]/, "Use pelo menos uma letra.")
  .regex(/\d/, "Use pelo menos um número.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

const personNameSchema = z
  .string()
  .trim()
  .min(2, "Informe seu nome.")
  .max(80, "Nome muito longo.");

export const signUpSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({ fullName: personNameSchema });

export type ProfileInput = z.infer<typeof profileSchema>;

export const DELETE_ACCOUNT_CONFIRMATION = "EXCLUIR";

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (value) => value.trim().toUpperCase() === DELETE_ACCOUNT_CONFIRMATION,
      `Digite ${DELETE_ACCOUNT_CONFIRMATION} para confirmar.`,
    ),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
