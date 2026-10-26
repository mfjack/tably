"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type OpeningStatus,
  summarizeOpeningStatus,
} from "@/features/organizations/opening-hours";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_IN_MS = 30_000;

type MenuOpeningStatusProps = {
  status: OpeningStatus;
};

export function MenuOpeningStatus({ status }: MenuOpeningStatusProps) {
  const router = useRouter();
  const now = useNow(REFRESH_INTERVAL_IN_MS);
  const summary = summarizeOpeningStatus(status, now);
  const hasStatusChanged =
    summary?.nextChangeAt !== null &&
    summary?.nextChangeAt !== undefined &&
    now >= summary.nextChangeAt;

  useEffect(() => {
    if (hasStatusChanged) router.refresh();
  }, [hasStatusChanged, router]);

  if (!summary) return null;

  return (
    <Badge
      variant={summary.isOpen ? "success" : "destructive"}
      className="h-8 gap-2 px-3 text-sm"
      role="status"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          summary.isOpen ? "bg-emerald-500" : "bg-destructive",
        )}
      />
      <span suppressHydrationWarning>{summary.label}</span>
    </Badge>
  );
}
