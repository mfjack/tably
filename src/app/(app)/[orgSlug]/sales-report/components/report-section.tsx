import type { ReactNode } from "react";

type ReportSectionProps = {
  title: string;
  children: ReactNode;
};

export function ReportSection({ title, children }: ReportSectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold text-base">{title}</h2>
      {children}
    </section>
  );
}
