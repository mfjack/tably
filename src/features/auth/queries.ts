import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser, UserId } from "./types";

export const getCurrentUserId = cache(async (): Promise<UserId | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.sub as UserId | undefined) ?? null;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const userId = data.claims.sub as UserId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    email: data.claims.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
});
