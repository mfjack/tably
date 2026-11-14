import "server-only";

import {
  getUserOrganizationById,
  getUserOrganizations,
} from "@/features/organizations/queries";
import type {
  AppModuleId,
  OrganizationId,
  UserOrganization,
} from "@/features/organizations/types";
import { createClient } from "@/lib/supabase/server";
import { canAccessSettings, isModuleAllowed } from "./access";

type OrganizationRecordTable =
  | "account_entries"
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

type ModuleAccessTarget = AppModuleId | "settings";

function toModuleList<TModule extends ModuleAccessTarget>(
  moduleIds: TModule | readonly TModule[],
): readonly TModule[] {
  return typeof moduleIds === "string" ? [moduleIds] : moduleIds;
}

function canAccessAnyModule(
  organization: UserOrganization | null | undefined,
  moduleIds: readonly ModuleAccessTarget[],
): boolean {
  if (!organization) return false;
  return moduleIds.some((moduleId) =>
    moduleId === "settings"
      ? canAccessSettings(organization)
      : isModuleAllowed(organization, moduleId),
  );
}

export async function hasModuleAccess(
  organizationId: OrganizationId,
  moduleId: ModuleAccessTarget,
): Promise<boolean> {
  return canAccessAnyModule(await getUserOrganizationById(organizationId), [
    moduleId,
  ]);
}

export async function hasAnyModuleAccess(
  organizationId: OrganizationId,
  moduleIds: readonly AppModuleId[],
): Promise<boolean> {
  return canAccessAnyModule(
    await getUserOrganizationById(organizationId),
    moduleIds,
  );
}

export async function hasModuleAccessToRecord(
  organizationId: string | null | undefined,
  moduleIds: AppModuleId | readonly AppModuleId[],
): Promise<boolean> {
  if (!organizationId) return false;
  return hasAnyModuleAccess(
    organizationId as OrganizationId,
    toModuleList(moduleIds),
  );
}

export async function hasModuleAccessToRow(
  table: OrganizationRecordTable,
  id: string,
  moduleIds: AppModuleId | readonly AppModuleId[],
): Promise<boolean> {
  const supabase = await createClient();
  const [{ data }, organizations] = await Promise.all([
    supabase.from(table).select("organization_id").eq("id", id).maybeSingle(),
    getUserOrganizations(),
  ]);
  const organization = organizations.find(
    ({ id: organizationId }) => organizationId === data?.organization_id,
  );
  return canAccessAnyModule(organization, toModuleList(moduleIds));
}

export async function isOrganizationOwner(
  organizationId: OrganizationId,
): Promise<boolean> {
  const organization = await getUserOrganizationById(organizationId);
  return organization?.role === "owner";
}
