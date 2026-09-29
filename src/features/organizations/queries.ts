import "server-only";

import { cache } from "react";
import { getCurrentUserId } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationId, UserOrganization } from "./types";

const USER_ORGANIZATION_COLUMNS =
  "id, name, slug, hidden_modules, takeaway_fee, is_takeaway_enabled, tax_id, phone, address, memberships!inner(role, user_id)";

export const getUserOrganizations = cache(
  async (): Promise<UserOrganization[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select(USER_ORGANIZATION_COLUMNS)
      .eq("memberships.user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data.map((organization) => ({
      id: organization.id as OrganizationId,
      name: organization.name,
      slug: organization.slug,
      role: organization.memberships[0].role,
      hiddenModules: organization.hidden_modules,
      takeawayFee: organization.takeaway_fee,
      isTakeawayEnabled: organization.is_takeaway_enabled,
      taxId: organization.tax_id,
      phone: organization.phone,
      address: organization.address,
    }));
  },
);

export async function getUserOrganizationBySlug(
  slug: string,
): Promise<UserOrganization | null> {
  const organizations = await getUserOrganizations();
  return (
    organizations.find((organization) => organization.slug === slug) ?? null
  );
}
