import "server-only";

import { getUserOrganizationById } from "@/features/organizations/queries";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import { canAccessSettings, isModuleAllowed } from "./access";

type OrganizationRecordTable =
  | "categories"
  | "customer_accounts"
  | "ingredients"
  | "kitchen_tickets"
  | "online_orders"
  | "order_items"
  | "orders"
  | "product_addons"
  | "products"
  | "purchase_orders"
  | "suppliers";

export const MODULE_ACCESS_DENIED_MESSAGE =
  "Você não tem acesso a essa página. Peça a liberação ao dono.";

export async function hasModuleAccess(
  organizationId: OrganizationId,
  moduleId: AppModuleId | "settings",
): Promise<boolean> {
  const organization = await getUserOrganizationById(organizationId);
  if (!organization) return false;
  if (moduleId === "settings") return canAccessSettings(organization);
  return isModuleAllowed(organization, moduleId);
}

export async function hasAnyModuleAccess(
  organizationId: OrganizationId,
  moduleIds: readonly AppModuleId[],
): Promise<boolean> {
  for (const moduleId of moduleIds) {
    if (await hasModuleAccess(organizationId, moduleId)) return true;
  }
  return false;
}

export async function hasModuleAccessToRecord(
  organizationId: string | null | undefined,
  moduleIds: AppModuleId | readonly AppModuleId[],
): Promise<boolean> {
  if (!organizationId) return false;
  return hasAnyModuleAccess(
    organizationId as OrganizationId,
    typeof moduleIds === "string" ? [moduleIds] : moduleIds,
  );
}

export async function hasModuleAccessToRow(
  table: OrganizationRecordTable,
  id: string,
  moduleIds: AppModuleId | readonly AppModuleId[],
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("organization_id")
    .eq("id", id)
    .maybeSingle();
  return hasModuleAccessToRecord(data?.organization_id, moduleIds);
}

export async function isOrganizationOwner(
  organizationId: OrganizationId,
): Promise<boolean> {
  const organization = await getUserOrganizationById(organizationId);
  return organization?.role === "owner";
}
