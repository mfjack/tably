import { Info } from "lucide-react";
import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type InfoHintProps = {
  label: string;
  children: ReactNode;
};

export function InfoHint({ label, children }: InfoHintProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        }
      >
        <Info aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-72 tabular-nums">
        {children}
      </PopoverContent>
    </Popover>
  );
}
