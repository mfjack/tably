import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "./database.types";

export function createAdminClient() {
  if (!serverEnv.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
