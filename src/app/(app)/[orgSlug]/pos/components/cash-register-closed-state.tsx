import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type CashRegisterClosedStateProps = {
  onOpenRegister: () => void;
};

export function CashRegisterClosedState({
  onOpenRegister,
}: CashRegisterClosedStateProps) {
  return (
    <Empty className="flex-1 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Caixa fechado</EmptyTitle>
        <EmptyDescription>
          Abra o caixa com o troco da gaveta para começar a vender.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="h-11 px-5" onClick={onOpenRegister}>
          <Wallet aria-hidden />
          Abrir caixa
        </Button>
      </EmptyContent>
    </Empty>
  );
}
