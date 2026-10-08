"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import type { DuePayablesSummary } from "@/features/finance/due-payables";
import type { OrganizationId } from "@/features/organizations/types";
import { formatCurrency } from "@/lib/format";

const TOAST_DURATION_IN_MS = 12_000;

type DuePayablesNotifierProps = {
  organizationId: OrganizationId;
  summary: DuePayablesSummary;
  financeHref: string;
};

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeSummary(summary: DuePayablesSummary): string {
  return [
    summary.overdueCount > 0 &&
      pluralize(summary.overdueCount, "atrasada", "atrasadas"),
    summary.dueTodayCount > 0 &&
      pluralize(summary.dueTodayCount, "vence hoje", "vencem hoje"),
    summary.dueTomorrowCount > 0 &&
      pluralize(summary.dueTomorrowCount, "vence amanhã", "vencem amanhã"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function getStorageKey(organizationId: OrganizationId, today: string) {
  return `tably:due-payables:${organizationId}:${today}`;
}

function wasShownToday(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

function markShownToday(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {}
}

export function DuePayablesNotifier({
  organizationId,
  summary,
  financeHref,
}: DuePayablesNotifierProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnFinancePage = pathname.startsWith(financeHref);
  const pendingCount =
    summary.overdueCount + summary.dueTodayCount + summary.dueTomorrowCount;

  useEffect(() => {
    if (pendingCount === 0 || isOnFinancePage) return;
    const storageKey = getStorageKey(organizationId, summary.today);
    if (wasShownToday(storageKey)) return;
    markShownToday(storageKey);
    toast.warning("Contas a pagar pedindo atenção", {
      description: `${describeSummary(summary)} · ${formatCurrency(summary.totalAmount)}`,
      duration: TOAST_DURATION_IN_MS,
      action: {
        label: "Ver contas",
        onClick: () => router.push(`${financeHref}?tab=payables`),
      },
    });
  }, [
    organizationId,
    summary,
    pendingCount,
    isOnFinancePage,
    financeHref,
    router,
  ]);

  return null;
}
