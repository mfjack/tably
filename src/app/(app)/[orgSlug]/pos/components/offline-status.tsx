"use client";

import { CloudUpload, TriangleAlert, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { OrganizationId } from "@/features/organizations/types";
import {
  useHydratedOfflineOrderQueue,
  useOfflineOrderQueue,
} from "@/features/pos/offline-order-queue";
import { useIsOnline } from "@/hooks/use-is-online";
import { cn } from "@/lib/utils";
import { QueuedOrdersDialog } from "./queued-orders-dialog";

type OfflineStatusProps = {
  organizationId: OrganizationId;
};

function formatQueuedOrdersLabel(count: number) {
  return count === 1 ? "1 venda para enviar" : `${count} vendas para enviar`;
}

export function OfflineStatus({ organizationId }: OfflineStatusProps) {
  const isOnline = useIsOnline();
  const isQueueHydrated = useHydratedOfflineOrderQueue();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queuedOrders = useOfflineOrderQueue((state) => state.queuedOrders);
  const organizationOrders = isQueueHydrated
    ? queuedOrders.filter(
        (queuedOrder) => queuedOrder.organizationId === organizationId,
      )
    : [];
  const hasFailedOrders = organizationOrders.some(
    (queuedOrder) => queuedOrder.syncState.status === "failed",
  );
  const QueueIcon = hasFailedOrders ? TriangleAlert : CloudUpload;

  if (isOnline && organizationOrders.length === 0) return null;

  return (
    <>
      {!isOnline && (
        <span className="inline-flex h-11 items-center gap-2 rounded-lg bg-muted px-3 font-medium text-muted-foreground text-sm">
          <WifiOff className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sem internet</span>
        </span>
      )}
      {organizationOrders.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 px-3 sm:px-4",
            hasFailedOrders &&
              "border-destructive/40 text-destructive hover:text-destructive",
          )}
          aria-label={formatQueuedOrdersLabel(organizationOrders.length)}
          onClick={() => setIsDialogOpen(true)}
        >
          <QueueIcon aria-hidden />
          <span className="hidden sm:inline">
            {formatQueuedOrdersLabel(organizationOrders.length)}
          </span>
          <span className="sm:hidden">{organizationOrders.length}</span>
        </Button>
      )}
      <QueuedOrdersDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        queuedOrders={organizationOrders}
        isOnline={isOnline}
      />
    </>
  );
}
