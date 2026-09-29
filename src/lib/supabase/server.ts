import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  buildOperatorSessionsHeader,
  OPERATOR_SESSIONS_HEADER,
} from "@/features/operators/session";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const operatorSessionsHeader = buildOperatorSessionsHeader(
    cookieStore.getAll(),
  );

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: operatorSessionsHeader
          ? { [OPERATOR_SESSIONS_HEADER]: operatorSessionsHeader }
          : {},
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            return;
          }
        },
      },
    },
  );
}
