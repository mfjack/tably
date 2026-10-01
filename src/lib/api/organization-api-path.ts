import type { OrganizationId } from "@/features/organizations/types";

export function organizationApiPath(
  organizationId: OrganizationId,
  path: string,
  searchParams?: Readonly<Record<string, string | number>>,
): string {
  const basePath = `/api/organizations/${organizationId}/${path}`;
  if (!searchParams) return basePath;

  const query = new URLSearchParams(
    Object.entries(searchParams).map(([key, value]) => [key, String(value)]),
  );
  return `${basePath}?${query.toString()}`;
}
