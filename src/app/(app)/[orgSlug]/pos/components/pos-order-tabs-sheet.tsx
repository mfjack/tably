"use client";

import { MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OrderTabsBoard } from "@/features/orders/components/order-tabs/order-tabs-board";
import type { OrderTicketBusiness } from "@/features/orders/print-order-ticket";
import type { OrderTabTarget } from "@/features/orders/types";
import type {
  OrganizationCheckoutSettings,
  OrganizationId,
} from "@/features/organizations/types";

type PosOrderTabsSheetProps = {
  organizationId: OrganizationId;
  ticketBusiness: OrderTicketBusiness;
  checkoutSettings: OrganizationCheckoutSettings;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddProducts: (tabTarget: OrderTabTarget) => void;
};

export function PosOrderTabsSheet({
  organizationId,
  ticketBusiness,
  checkoutSettings,
  isOpen,
  onOpenChange,
  onAddProducts,
}: PosOrderTabsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-background data-[side=right]:w-full data-[side=right]:sm:max-w-none"
      >
        <header className="flex shrink-0 items-center gap-3 px-4 pt-7 pb-1 md:px-6">
          <SheetTitle className="min-w-0 flex-1 truncate font-bold text-[1.375rem] leading-7 tracking-[-0.02em]">
            Comandas
          </SheetTitle>
          <Button
            variant="outline"
            className="h-10 px-3 sm:px-4"
            aria-label="Voltar para o PDV"
            onClick={() => onOpenChange(false)}
          >
            <MonitorSmartphone aria-hidden />
            <span className="hidden sm:inline">PDV</span>
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-6 md:px-6">
          <OrderTabsBoard
            organizationId={organizationId}
            ticketBusiness={ticketBusiness}
            checkoutSettings={checkoutSettings}
            onAddProducts={onAddProducts}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
