import { type LucideIcon, Plus } from "lucide-react";
import Link from "next/link";
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
} & (
  | { onCreate: () => void; createHref?: never }
  | { createHref: string; onCreate?: never }
);

export function ListEmptyState({
  icon: Icon,
  title,
  description,
  createLabel,
  canCreate,
  onCreate,
  createHref,
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
          {createHref ? (
            <Button
              className="h-10"
              nativeButton={false}
              render={<Link href={createHref} />}
            >
              <Plus aria-hidden />
              {createLabel}
            </Button>
          ) : (
            <Button className="h-10" onClick={onCreate}>
              <Plus aria-hidden />
              {createLabel}
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}
