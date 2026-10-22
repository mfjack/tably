import "server-only";

import type { DehydratedState } from "@tanstack/react-query";
import type {
  AppModuleId,
  OrganizationId,
} from "@/features/organizations/types";
import { hasModuleAccess } from "@/features/team/module-access";
import {
  type ActionQuery,
  prefetchActionQueries,
} from "@/lib/query/prefetch-action-queries";

export async function prefetchModuleQueries(
  organizationId: OrganizationId,
  moduleId: AppModuleId,
  queries: readonly ActionQuery[],
): Promise<DehydratedState> {
  const canAccessModule = await hasModuleAccess(organizationId, moduleId);
  return prefetchActionQueries(canAccessModule ? queries : []);
}
