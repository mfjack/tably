import { type LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ListEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  createLabel: string;
  canCreate: boolean;
  onCreate: () => void;
};

export function ListEmptyState({
  icon: Icon,
  title,
  description,
  createLabel,
  canCreate,
  onCreate,
}: ListEmptyStateProps) {
  return (
    <Empty className="flex-1 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {canCreate && (
        <EmptyContent>
          <Button className="h-10" onClick={onCreate}>
            <Plus aria-hidden />
            {createLabel}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
