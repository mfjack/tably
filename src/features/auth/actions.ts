"use server";

import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { env } from "@/lib/env";
import { ROUTES } from "@/lib/routes";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthErrorMessage,
  INVALID_FORM_MESSAGE,
  isRateLimitError,
} from "./errors";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignInInput,
  type SignUpInput,
  signInSchema,
  signUpSchema,
} from "./schemas";

export type SignUpResult = { requiresEmailConfirmation: boolean };

export type OAuthRedirect = { url: string };

function buildAuthCallbackUrl(nextPath: string): string {
  const callbackUrl = new URL(ROUTES.authCallback, env.NEXT_PUBLIC_SITE_URL);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsedInput = signInSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsedInput.data);
  if (error) return actionFailure(getAuthErrorMessage(error));

  return actionSuccess();
}

export async function signUp(
  input: SignUpInput,
): Promise<ActionResult<SignUpResult>> {
  const parsedInput = signUpSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const { name, email, password } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: buildAuthCallbackUrl(ROUTES.home),
    },
  });
  if (error) return actionFailure(getAuthErrorMessage(error));

  return actionSuccess({ requiresEmailConfirmation: !data.session });
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsedInput = forgotPasswordSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsedInput.data.email,
    { redirectTo: buildAuthCallbackUrl(ROUTES.resetPassword) },
  );

  if (error && isRateLimitError(error)) {
    return actionFailure(getAuthErrorMessage(error));
  }
  return actionSuccess();
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsedInput = resetPasswordSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsedInput.data.password,
  });
  if (error) return actionFailure(getAuthErrorMessage(error));

  return actionSuccess();
}

export async function getGoogleSignInUrl(
  nextPath?: string,
): Promise<ActionResult<OAuthRedirect>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(getSafeRedirectPath(nextPath)),
    },
  });
  if (error) return actionFailure(getAuthErrorMessage(error));

  return actionSuccess({ url: data.url });
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return actionFailure(getAuthErrorMessage(error));

  return actionSuccess();
}
