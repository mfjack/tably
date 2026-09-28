import type { MemberRole } from "./types";

const CATALOG_MANAGER_ROLES: readonly MemberRole[] = ["owner", "manager"];

export function canManageCatalog(role: MemberRole): boolean {
  return CATALOG_MANAGER_ROLES.includes(role);
}
