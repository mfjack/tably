import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KitchenPreview } from "./landing-previews/kitchen-preview";
import { PosPreview } from "./landing-previews/pos-preview";
import { ReportPreview } from "./landing-previews/report-preview";

type PreviewWindowProps = {
  title: string;
  className: string;
  children: ReactNode;
};

function PreviewWindow({ title, className, children }: PreviewWindowProps) {
  return (
    <div
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-xl",
        className,
      )}
    >
      <div className="flex h-6 shrink-0 items-center gap-1 border-b bg-muted/60 px-2.5">
        <span className="size-1.5 rounded-full bg-foreground/15" />
        <span className="size-1.5 rounded-full bg-foreground/15" />
        <span className="size-1.5 rounded-full bg-foreground/15" />
        <span className="ml-2 text-[0.5625rem] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-[33rem] w-full max-w-2xl select-none sm:h-[37rem]"
    >
      <PreviewWindow
        title="Relatório"
        className="top-0 left-0 h-[15rem] w-[80%]"
      >
        <ReportPreview />
      </PreviewWindow>
      <PreviewWindow
        title="Cozinha"
        className="top-[6.5rem] right-0 h-[15rem] w-[80%] sm:top-[7.5rem]"
      >
        <KitchenPreview />
      </PreviewWindow>
      <PreviewWindow
        title="PDV"
        className="bottom-0 left-[4%] h-[19rem] w-[90%] shadow-2xl sm:h-[20rem]"
      >
        <PosPreview />
      </PreviewWindow>
    </div>
  );
}
