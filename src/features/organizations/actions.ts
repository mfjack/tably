"use server";

import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateOrganizationInput,
  createOrganizationSchema,
} from "./schemas";
import { buildSlugCandidate, slugify } from "./slug";

const MAX_SLUG_ATTEMPTS = 5;
const UNIQUE_VIOLATION_CODE = "23505";

export type CreatedOrganization = { slug: string };

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<ActionResult<CreatedOrganization>> {
  const parsedInput = createOrganizationSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { name } = parsedInput.data;
  const baseSlug = slugify(name);
  const supabase = await createClient();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("create_organization", {
      p_name: name,
      p_slug: buildSlugCandidate(baseSlug, attempt),
    });

    if (!error) return actionSuccess({ slug: data.slug });
    if (error.code !== UNIQUE_VIOLATION_CODE) break;
  }

  return actionFailure(
    "Não foi possível criar o estabelecimento. Tente novamente.",
  );
}
