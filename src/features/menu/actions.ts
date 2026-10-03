"use server";

import {
  hasModuleAccess,
  MODULE_ACCESS_DENIED_MESSAGE,
} from "@/features/operators/module-access";
import type { OrganizationId } from "@/features/organizations/types";
import {
  type ActionResult,
  actionFailure,
  actionSuccess,
} from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { type MenuSettingsInput, menuSettingsSchema } from "./schemas";

export async function updateMenuSettings(
  organizationId: OrganizationId,
  input: MenuSettingsInput,
): Promise<ActionResult> {
  if (!(await hasModuleAccess(organizationId, "settings"))) {
    return actionFailure(MODULE_ACCESS_DENIED_MESSAGE);
  }

  const parsedInput = menuSettingsSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionFailure("Confira os campos e tente novamente.");
  }

  const { isOnlineOrderingEnabled, title, tagline, instagram, note } =
    parsedInput.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      is_online_ordering_enabled: isOnlineOrderingEnabled,
      menu_title: title || null,
      menu_tagline: tagline || null,
      menu_instagram: instagram.replace(/^@/, "") || null,
      menu_note: note || null,
    })
    .eq("id", organizationId)
    .select("id");

  if (error || data.length === 0) {
    return actionFailure("Não foi possível salvar o cardápio.");
  }

  return actionSuccess();
}
