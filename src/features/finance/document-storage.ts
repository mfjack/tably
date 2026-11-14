import "server-only";

import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_DOCUMENTS_BUCKET } from "./documents";

export async function removeFinancialDocuments(
  paths: readonly (string | null)[],
) {
  const existingPaths = paths.filter((path) => path !== null);
  if (existingPaths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from(FINANCIAL_DOCUMENTS_BUCKET).remove(existingPaths);
}
