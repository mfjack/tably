import { type NextRequest, NextResponse } from "next/server";
import { LOGIN_ERROR_CODES, ROUTES } from "@/lib/routes";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

const INVALID_LINK_PATH = `${ROUTES.login}?error=${LOGIN_ERROR_CODES.invalidLink}`;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const authCode = searchParams.get("code");
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  if (!authCode) {
    return NextResponse.redirect(new URL(INVALID_LINK_PATH, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(authCode);
  const redirectPath = error ? INVALID_LINK_PATH : nextPath;

  return NextResponse.redirect(new URL(redirectPath, origin));
}
