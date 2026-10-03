"use server";

import { FINANCIAL_DOCUMENTS_BUCKET } from "@/features/finance/documents";
import { PRODUCT_IMAGES_BUCKET } from "@/features/products/product-image";
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
  type DeleteAccountInput,
  deleteAccountSchema,
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type ProfileInput,
  profileSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignInInput,
  type SignUpInput,
  signInSchema,
  signUpSchema,
} from "./schemas";

const STORAGE_LIST_LIMIT = 1000;

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

  const { name, email, password, plan, billingCycle } = parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        selected_plan: plan,
        selected_billing_cycle: billingCycle,
      },
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

export async function updateProfile(
  input: ProfileInput,
): Promise<ActionResult> {
  const parsedInput = profileSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return actionFailure("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsedInput.data.fullName })
    .eq("id", userId);

  if (error) return actionFailure("Não foi possível salvar seu perfil.");

  return actionSuccess();
}

export type OwnedOrganization = { id: string; name: string };

export async function listOwnedOrganizations(): Promise<
  ActionResult<OwnedOrganization[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_owned_organizations");
  if (error) return actionFailure("Não foi possível carregar seus dados.");
  return actionSuccess(data);
}

async function removeOrganizationFiles(organizationIds: readonly string[]) {
  const supabase = await createClient();
  const productImages = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const documents = supabase.storage.from(FINANCIAL_DOCUMENTS_BUCKET);

  await Promise.all(
    organizationIds.map(async (organizationId) => {
      const { data: images } = await productImages.list(organizationId, {
        limit: STORAGE_LIST_LIMIT,
      });
      const imagePaths = (images ?? []).map(
        (file) => `${organizationId}/${file.name}`,
      );
      if (imagePaths.length > 0) await productImages.remove(imagePaths);

      const { data: entryFolders } = await documents.list(organizationId, {
        limit: STORAGE_LIST_LIMIT,
      });
      const documentPaths = (
        await Promise.all(
          (entryFolders ?? []).map(async (folder) => {
            const folderPath = `${organizationId}/${folder.name}`;
            const { data: files } = await documents.list(folderPath, {
              limit: STORAGE_LIST_LIMIT,
            });
            return (files ?? []).map((file) => `${folderPath}/${file.name}`);
          }),
        )
      ).flat();
      if (documentPaths.length > 0) await documents.remove(documentPaths);
    }),
  );
}

export async function deleteMyAccount(
  input: DeleteAccountInput,
): Promise<ActionResult> {
  const parsedInput = deleteAccountSchema.safeParse(input);
  if (!parsedInput.success) return actionFailure(INVALID_FORM_MESSAGE);

  const supabase = await createClient();
  const { data: organizations, error: organizationsError } = await supabase.rpc(
    "list_my_owned_organizations",
  );
  if (organizationsError) {
    return actionFailure("Não foi possível excluir sua conta.");
  }

  await removeOrganizationFiles(
    organizations.map((organization) => organization.id),
  );

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return actionFailure("Não foi possível excluir sua conta.");

  await supabase.auth.signOut();
  return actionSuccess();
}
