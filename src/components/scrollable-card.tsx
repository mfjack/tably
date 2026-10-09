import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const scrollableCardVariants = cva(
  "flex flex-col gap-3 rounded-2xl border bg-card p-4",
  {
    variants: {
      size: {
        default: "h-80",
        tall: "h-96",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type ScrollableCardProps = VariantProps<typeof scrollableCardVariants> & {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
};

export function ScrollableCard({
  header,
  footer,
  children,
  size,
  ariaLabel,
}: ScrollableCardProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={scrollableCardVariants({ size })}
    >
      <div className="shrink-0">{header}</div>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
        {children}
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </section>
  );
}
