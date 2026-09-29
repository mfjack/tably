import type { MemberRole } from "./types";

const MANAGER_ROLES: readonly MemberRole[] = ["owner", "manager"];

export function canManageCatalog(role: MemberRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function canManageOrganization(role: MemberRole): boolean {
  return MANAGER_ROLES.includes(role);
}
