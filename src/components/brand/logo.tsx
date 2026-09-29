import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-7 items-center justify-center rounded-lg bg-primary",
        className,
      )}
    >
      <div className="size-3 rounded-sm bg-primary-foreground" />
    </div>
  );
}
