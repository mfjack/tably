import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDetails, OrderId } from "@/features/orders/types";
import { OpenOrderTabCard } from "./open-order-tab-card";

const LOADING_CARD_COUNT = 6;

const GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4";

type OpenOrderTabsGridProps = {
  orders: OrderDetails[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  posHref: string;
  onSelect: (orderId: OrderId) => void;
};

export function OpenOrderTabsGrid({
  orders,
  isLoading,
  errorMessage,
  posHref,
  onSelect,
}: OpenOrderTabsGridProps) {
  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className={GRID_CLASS_NAME}>
        {Array.from({ length: LOADING_CARD_COUNT }, (_, cardIndex) => (
          <Skeleton
            key={`loading-${cardIndex.toString()}`}
            className="h-[106px] rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <Empty className="flex-1 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nenhuma comanda aberta</EmptyTitle>
          <EmptyDescription>
            No PDV, toque em Imprimir pedido e escolha Abrir comanda.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            className="h-10"
            nativeButton={false}
            render={<Link href={posHref} />}
          >
            Ir para o PDV
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={GRID_CLASS_NAME}>
      {orders.map((order) => (
        <OpenOrderTabCard key={order.id} order={order} onSelect={onSelect} />
      ))}
    </div>
  );
}
