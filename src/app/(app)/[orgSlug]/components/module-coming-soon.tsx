import type { LucideIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "./page-header";

type ModuleComingSoonProps = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export function ModuleComingSoon({
  label,
  description,
  icon: Icon,
}: ModuleComingSoonProps) {
  return (
    <>
      <PageHeader title={label} description={description} />
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{label} em construção</EmptyTitle>
          <EmptyDescription>
            Este módulo ainda está sendo desenvolvido e logo estará disponível.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  );
}
