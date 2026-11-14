import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrganizationId } from "@/features/organizations/types";
import { CashRegisterPanel } from "./cash-register-panel";
import { OfflineStatus } from "./offline-status";
import { OnlineOrdersPanel } from "./online-orders-panel";
import { ThermalPrinterWarning } from "./thermal-printer-warning";

type PosHeaderActionsProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  printerSettingsHref: string;
  isOnlineOrderingEnabled: boolean;
  kitchenHref: string | null;
  isKitchenEnabled: boolean;
  openTabsCount: number;
  canShowOrderTabs: boolean;
  onOpenRegister: () => void;
  onOpenOrderTabs: () => void;
};

export function PosHeaderActions({
  organizationId,
  ticketBusiness,
  printerSettingsHref,
  isOnlineOrderingEnabled,
  kitchenHref,
  isKitchenEnabled,
  openTabsCount,
  canShowOrderTabs,
  onOpenRegister,
  onOpenOrderTabs,
}: PosHeaderActionsProps) {
  return (
    <>
      <ThermalPrinterWarning settingsHref={printerSettingsHref} />
      <OfflineStatus organizationId={organizationId} />
      <CashRegisterPanel
        organizationId={organizationId}
        ticketBusiness={ticketBusiness}
        onOpenRegister={onOpenRegister}
      />
      {isOnlineOrderingEnabled && (
        <OnlineOrdersPanel
          organizationId={organizationId}
          ticketBusiness={ticketBusiness}
          kitchenHref={kitchenHref}
          isKitchenEnabled={isKitchenEnabled}
        />
      )}
      {canShowOrderTabs && openTabsCount > 0 && (
        <Button
          variant="outline"
          className="h-10 px-3 sm:px-4"
          aria-label="Comandas"
          onClick={onOpenOrderTabs}
        >
          <ClipboardList aria-hidden />
          <span className="hidden sm:inline">Comandas</span>
          <span className="text-muted-foreground tabular-nums">
            {openTabsCount}
          </span>
        </Button>
      )}
    </>
  );
}
