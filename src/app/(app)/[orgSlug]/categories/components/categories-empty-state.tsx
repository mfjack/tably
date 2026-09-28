import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type CategoriesEmptyStateProps = {
  canManage: boolean;
  onCreate: () => void;
};

export function CategoriesEmptyState({
  canManage,
  onCreate,
}: CategoriesEmptyStateProps) {
  return (
    <Empty className="flex-1 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LayoutGrid aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Nenhuma categoria ainda</EmptyTitle>
        <EmptyDescription>
          As categorias organizam os produtos no PDV, como Cafés, Salgados ou
          Bebidas.
        </EmptyDescription>
      </EmptyHeader>
      {canManage && (
        <EmptyContent>
          <Button className="h-10" onClick={onCreate}>
            <Plus aria-hidden />
            Criar primeira categoria
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
