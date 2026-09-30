"use client";

import { useOperatorAutoLock } from "@/features/operators/hooks/use-operator-auto-lock";
import type { OrganizationId } from "@/features/organizations/types";

type OperatorAutoLockProps = {
  organizationId: OrganizationId;
  isUnlocked: boolean;
};

export function OperatorAutoLock({
  organizationId,
  isUnlocked,
}: OperatorAutoLockProps) {
  useOperatorAutoLock(organizationId, isUnlocked);
  return null;
}
